# backend/app/services/comisiones_service.py
from decimal import Decimal
from datetime import datetime, date
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.comision_vendedor import ComisionVendedor
from app.models.configuracion_comision import ConfiguracionComision
from app.models.liquidacion_comision import LiquidacionComision
from app.models.venta_pos import VentaPOS
from app.models.pedido import Pedido
from app.models.usuario import Usuario


def obtener_configuracion_activa(db: Session, tipo_venta: str) -> Optional[ConfiguracionComision]:
    """
    Obtiene la configuración de comisión activa para un tipo de venta.
    """
    return db.query(ConfiguracionComision).filter(
        ConfiguracionComision.tipo_venta == tipo_venta,
        ConfiguracionComision.activo == True
    ).first()  # ✅ REMOVIDO el filtro de fechas


def calcular_comision_venta_pos(
    db: Session,
    venta: VentaPOS,
    config: ConfiguracionComision
) -> Optional[ComisionVendedor]:
    """
    Calcula la comisión para una venta POS.
    
    Reglas:
    - Solo ventas en estado PAGADO (o estado final similar)
    - Monto mínimo según configuración
    - Porcentaje según tipo de venta
    """
    # Validar estado
    if venta.estado not in ("PAGADO", "COMPLETADO"):
        return None
    
    # Validar que no esté cancelada
    if venta.cancelado:
        return None
    
    # Validar monto mínimo
    if config.monto_minimo and venta.total < config.monto_minimo:
        return None
    
    # Calcular comisión
    monto_comision = (venta.total * config.porcentaje) / Decimal("100")
    
    # Crear registro
    comision = ComisionVendedor(
        vendedor_id=venta.vendedor_id,
        venta_pos_id=venta.id,
        monto_venta=venta.total,
        porcentaje_aplicado=config.porcentaje,
        monto_comision=monto_comision,
        tipo_venta="POS",
        estado="PENDIENTE",
        fecha_venta=venta.fecha_creacion
    )
    
    return comision


def calcular_comision_pedido(
    db: Session,
    pedido: Pedido,
    config: ConfiguracionComision
) -> Optional[ComisionVendedor]:
    """
    Calcula la comisión para un pedido online.
    Solo si tiene vendedor asignado.
    """
    # Solo si tiene vendedor
    if not pedido.vendedor_id:
        return None
    
    # Validar estado (pedidos entregados o confirmados)
    if pedido.estado not in ("ENTREGADO", "PAGADO"):
        return None
    
    # Validar que no esté cancelado
    if pedido.cancelado:
        return None
    
    # Validar monto mínimo
    if config.monto_minimo and pedido.total < config.monto_minimo:
        return None
    
    # Calcular comisión
    monto_comision = (pedido.total * config.porcentaje) / Decimal("100")
    
    # Crear registro
    comision = ComisionVendedor(
        vendedor_id=pedido.vendedor_id,
        pedido_id=pedido.id,
        monto_venta=pedido.total,
        porcentaje_aplicado=config.porcentaje,
        monto_comision=monto_comision,
        tipo_venta="ONLINE",
        estado="PENDIENTE",
        fecha_venta=pedido.fecha_creacion if hasattr(pedido, 'fecha_creacion') else datetime.now()
    )
    
    return comision


def calcular_comisiones_periodo(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    vendedor_id: Optional[int] = None,
    tipo_venta: Optional[str] = None
) -> dict:
    """
    Calcula comisiones pendientes para un período específico.
    
    Returns:
        dict con comisiones_calculadas, monto_total, ventas_procesadas, detalles
    """
    comisiones_creadas = []
    monto_total = Decimal("0")
    ventas_procesadas = 0
    detalles_por_vendedor = {}
    
    # Convertir fechas a datetime para comparación
    fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
    fecha_fin_dt = datetime.combine(fecha_fin, datetime.max.time())
    
    # Procesar ventas POS
    if tipo_venta is None or tipo_venta == "POS":
        config_pos = obtener_configuracion_activa(db, "POS")
        
        if config_pos:
            query_ventas = db.query(VentaPOS).filter(
                VentaPOS.fecha_creacion >= fecha_inicio_dt,
                VentaPOS.fecha_creacion <= fecha_fin_dt,
                VentaPOS.estado.in_(["PAGADO", "COMPLETADO"]),
                VentaPOS.cancelado == False,
                ~VentaPOS.id.in_(
                    db.query(ComisionVendedor.venta_pos_id).filter(
                        ComisionVendedor.venta_pos_id.isnot(None)
                    )
                )
            )
            
            if vendedor_id:
                query_ventas = query_ventas.filter(VentaPOS.vendedor_id == vendedor_id)
            
            ventas = query_ventas.all()
            
            for venta in ventas:
                comision = calcular_comision_venta_pos(db, venta, config_pos)
                
                if comision:
                    db.add(comision)
                    db.flush()
                    
                    comisiones_creadas.append(comision)
                    monto_total += comision.monto_comision
                    ventas_procesadas += 1
                    
                    # Agregar a detalles
                    vendedor_key = venta.vendedor_id
                    if vendedor_key not in detalles_por_vendedor:
                        vendedor = db.query(Usuario).filter(Usuario.id == vendedor_key).first()
                        detalles_por_vendedor[vendedor_key] = {
                            'vendedor_id': vendedor_key,
                            'vendedor_nombre': vendedor.nombre if vendedor else "Desconocido",
                            'cantidad': 0,
                            'monto_comisiones': Decimal("0.00")
                        }
                    
                    detalles_por_vendedor[vendedor_key]['cantidad'] += 1
                    detalles_por_vendedor[vendedor_key]['monto_comisiones'] += comision.monto_comision
    
    # Procesar pedidos ONLINE
    if tipo_venta is None or tipo_venta == "ONLINE":
        config_online = obtener_configuracion_activa(db, "ONLINE")
        
        if config_online:
            query_pedidos = db.query(Pedido).filter(
                Pedido.fecha_creacion >= fecha_inicio_dt,
                Pedido.fecha_creacion <= fecha_fin_dt,
                Pedido.estado.in_(["ENTREGADO", "PAGADO"]),
                Pedido.cancelado == False,
                Pedido.vendedor_id.isnot(None),
                ~Pedido.id.in_(
                    db.query(ComisionVendedor.pedido_id).filter(
                        ComisionVendedor.pedido_id.isnot(None)
                    )
                )
            )
            
            if vendedor_id:
                query_pedidos = query_pedidos.filter(Pedido.vendedor_id == vendedor_id)
            
            pedidos = query_pedidos.all()
            
            for pedido in pedidos:
                comision = calcular_comision_pedido(db, pedido, config_online)
                
                if comision:
                    db.add(comision)
                    db.flush()
                    
                    comisiones_creadas.append(comision)
                    monto_total += comision.monto_comision
                    ventas_procesadas += 1
                    
                    # Agregar a detalles
                    vendedor_key = pedido.vendedor_id
                    if vendedor_key not in detalles_por_vendedor:
                        vendedor = db.query(Usuario).filter(Usuario.id == vendedor_key).first()
                        detalles_por_vendedor[vendedor_key] = {
                            'vendedor_id': vendedor_key,
                            'vendedor_nombre': vendedor.nombre if vendedor else "Desconocido",
                            'cantidad': 0,
                            'monto_comisiones': Decimal("0.00")
                        }
                    
                    detalles_por_vendedor[vendedor_key]['cantidad'] += 1
                    detalles_por_vendedor[vendedor_key]['monto_comisiones'] += comision.monto_comision
    
    db.commit()
    
    return {
        "comisiones_calculadas": len(comisiones_creadas),
        "monto_total": float(monto_total),
        "ventas_procesadas": ventas_procesadas,
        "detalles": list(detalles_por_vendedor.values())
    }


def liquidar_comisiones(
    db: Session,
    vendedor_id: int,
    comisiones_ids: List[int],
    usuario_liquidador: Usuario,
    periodo_inicio: date,
    periodo_fin: date,
    metodo_pago: str,
    referencia_pago: Optional[str] = None,
    observaciones: Optional[str] = None
) -> Tuple[LiquidacionComision, List[int]]:
    """
    Liquida comisiones pendientes de un vendedor.
    
    - Valida que todas las comisiones sean del vendedor
    - Valida estado PENDIENTE
    - Crea registro de liquidación
    - Actualiza estado de comisiones
    
    Returns:
        Tuple con (liquidacion, lista de ids liquidados)
    """
    # Obtener comisiones
    comisiones = db.query(ComisionVendedor).filter(
        ComisionVendedor.id.in_(comisiones_ids),
        ComisionVendedor.vendedor_id == vendedor_id,
        ComisionVendedor.estado == "PENDIENTE"
    ).all()
    
    if len(comisiones) != len(comisiones_ids):
        raise ValueError("Algunas comisiones no son válidas o no pertenecen al vendedor")
    
    if not comisiones:
        raise ValueError("No hay comisiones para liquidar")
    
    # Calcular total
    monto_total = sum(c.monto_comision for c in comisiones)
    
    # Crear liquidación
    liquidacion = LiquidacionComision(
        vendedor_id=vendedor_id,
        periodo_inicio=periodo_inicio,
        periodo_fin=periodo_fin,
        monto_total=monto_total,
        cantidad_ventas=len(comisiones),
        liquidada_por=usuario_liquidador.id,
        metodo_pago=metodo_pago,
        referencia_pago=referencia_pago,
        observaciones=observaciones
    )
    
    db.add(liquidacion)
    db.flush()
    
    # Actualizar comisiones
    ids_liquidados = []
    for comision in comisiones:
        comision.estado = "LIQUIDADA"
        comision.fecha_liquidacion = datetime.now()
        comision.liquidado_por_id = usuario_liquidador.id
        ids_liquidados.append(comision.id)
    
    db.commit()
    db.refresh(liquidacion)
    
    return liquidacion, ids_liquidados


def obtener_comisiones_vendedor(
    db: Session,
    vendedor_id: int,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    estado: Optional[str] = None,
    tipo_venta: Optional[str] = None,
    page: int = 1,
    per_page: int = 50
) -> Tuple[List[ComisionVendedor], int]:
    """
    Obtiene comisiones de un vendedor con filtros y paginación.
    
    Returns:
        Tuple con (lista de comisiones, total de registros)
    """
    query = db.query(ComisionVendedor).filter(
        ComisionVendedor.vendedor_id == vendedor_id
    )
    
    if fecha_inicio:
        fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
        query = query.filter(ComisionVendedor.fecha_venta >= fecha_inicio_dt)
    
    if fecha_fin:
        fecha_fin_dt = datetime.combine(fecha_fin, datetime.max.time())
        query = query.filter(ComisionVendedor.fecha_venta <= fecha_fin_dt)
    
    if estado and estado != "TODOS":
        query = query.filter(ComisionVendedor.estado == estado)
    
    if tipo_venta:
        query = query.filter(ComisionVendedor.tipo_venta == tipo_venta)
    
    # Contar total
    total = query.count()
    
    # Aplicar paginación y ordenar
    comisiones = query.order_by(
        ComisionVendedor.fecha_venta.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()
    
    return comisiones, total


def obtener_resumen_comisiones_vendedor(
    db: Session,
    vendedor_id: int
) -> dict:
    """
    Obtiene resumen de comisiones de un vendedor.
    
    Returns:
        dict con total_pendiente, total_liquidado, cantidad_ventas
    """
    # Total pendiente
    pendiente = db.query(func.sum(ComisionVendedor.monto_comision)).filter(
        ComisionVendedor.vendedor_id == vendedor_id,
        ComisionVendedor.estado == "PENDIENTE"
    ).scalar() or Decimal("0.00")
    
    # Total liquidado
    liquidado = db.query(func.sum(ComisionVendedor.monto_comision)).filter(
        ComisionVendedor.vendedor_id == vendedor_id,
        ComisionVendedor.estado == "LIQUIDADA"
    ).scalar() or Decimal("0.00")
    
    # Cantidad de ventas
    cantidad = db.query(func.count(ComisionVendedor.id)).filter(
        ComisionVendedor.vendedor_id == vendedor_id
    ).scalar() or 0
    
    return {
        "total_pendiente": float(pendiente),
        "total_liquidado": float(liquidado),
        "cantidad_ventas": cantidad
    }