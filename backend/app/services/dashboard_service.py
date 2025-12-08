# backend/app/services/dashboard_service.py
from decimal import Decimal
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc, case

from app.models.venta_pos import VentaPOS
from app.models.pedido import Pedido
from app.models.venta_pos_item import VentaPOSItem
from app.models.pedido_item import PedidoItem
from app.models.inventario import Inventario
from app.models.variante import Variante
from app.models.producto import Producto
from app.models.sucursal import Sucursal
from app.models.comision_vendedor import ComisionVendedor
from app.models.usuario import Usuario


def obtener_metricas_dashboard(
    db: Session,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    sucursal_id: Optional[int] = None
) -> dict:
    """
    Obtiene métricas generales del dashboard.
    
    Returns:
        dict con ventas_totales, pedidos_activos, ticket_promedio, ventas_por_canal
    """
    # Fechas por defecto: último mes
    if not fecha_inicio:
        fecha_inicio = datetime.now() - timedelta(days=30)
    if not fecha_fin:
        fecha_fin = datetime.now()
    
    # Calcular período anterior para variación
    duracion = (fecha_fin - fecha_inicio).days
    fecha_inicio_anterior = fecha_inicio - timedelta(days=duracion)
    fecha_fin_anterior = fecha_inicio
    
    # ===== VENTAS TOTALES =====
    query_ventas = db.query(
        func.sum(VentaPOS.total).label("total"),
        func.count(VentaPOS.id).label("cantidad")
    ).filter(
        VentaPOS.fecha_creacion >= fecha_inicio,
        VentaPOS.fecha_creacion <= fecha_fin,
        VentaPOS.estado.in_(["PAGADO", "COMPLETADO"]),
        VentaPOS.cancelado == False
    )
    
    if sucursal_id:
        query_ventas = query_ventas.filter(VentaPOS.sucursal_id == sucursal_id)
    
    ventas_resultado = query_ventas.first()
    ventas_total = float(ventas_resultado.total or 0)
    ventas_cantidad = ventas_resultado.cantidad or 0
    
    # Ventas período anterior
    query_ventas_anterior = db.query(
        func.sum(VentaPOS.total).label("total")
    ).filter(
        VentaPOS.fecha_creacion >= fecha_inicio_anterior,
        VentaPOS.fecha_creacion < fecha_fin_anterior,
        VentaPOS.estado.in_(["PAGADO", "COMPLETADO"]),
        VentaPOS.cancelado == False
    )
    
    if sucursal_id:
        query_ventas_anterior = query_ventas_anterior.filter(VentaPOS.sucursal_id == sucursal_id)
    
    ventas_anterior = float(query_ventas_anterior.scalar() or 0)
    
    # Calcular variación porcentual
    variacion = 0.0
    if ventas_anterior > 0:
        variacion = ((ventas_total - ventas_anterior) / ventas_anterior) * 100
    
    # ===== PEDIDOS ACTIVOS =====
    query_pedidos = db.query(
        Pedido.estado,
        func.count(Pedido.id).label("cantidad")
    ).filter(
        Pedido.cancelado == False,
        Pedido.estado.in_(["PAGADO", "EN_PREPARACION", "ENVIADO"])
    )
    
    if sucursal_id:
        query_pedidos = query_pedidos.filter(Pedido.sucursal_id == sucursal_id)
    
    pedidos_por_estado = query_pedidos.group_by(Pedido.estado).all()
    
    pedidos_dict = {estado: cantidad for estado, cantidad in pedidos_por_estado}
    total_pedidos = sum(pedidos_dict.values())
    
    # ===== TICKET PROMEDIO =====
    ticket_promedio = ventas_total / ventas_cantidad if ventas_cantidad > 0 else 0.0
    
    # ===== VENTAS POR CANAL =====
    ventas_pos = ventas_total
    
    query_pedidos_online = db.query(
        func.sum(Pedido.total).label("total")
    ).filter(
        Pedido.fecha_creacion >= fecha_inicio,
        Pedido.fecha_creacion <= fecha_fin,
        Pedido.cancelado == False
    )
    
    if sucursal_id:
        query_pedidos_online = query_pedidos_online.filter(Pedido.sucursal_id == sucursal_id)
    
    ventas_online = float(query_pedidos_online.scalar() or 0)
    
    return {
        "ventas_totales": {
            "monto": ventas_total,
            "cantidad": ventas_cantidad,
            "variacion_porcentual": round(variacion, 2)
        },
        "pedidos_activos": {
            "total": total_pedidos,
            "por_estado": pedidos_dict
        },
        "ticket_promedio": round(ticket_promedio, 2),
        "ventas_por_canal": {
            "POS": ventas_pos,
            "ONLINE": ventas_online
        },
        "ultima_actualizacion": datetime.now().isoformat()
    }


def obtener_productos_top(
    db: Session,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    sucursal_id: Optional[int] = None,
    limit: int = 10
) -> List[dict]:
    """
    Obtiene los productos más vendidos.
    
    Returns:
        Lista de productos con cantidad vendida y variantes populares
    """
    if not fecha_inicio:
        fecha_inicio = datetime.now() - timedelta(days=30)
    if not fecha_fin:
        fecha_fin = datetime.now()
    
    # Query para productos más vendidos de POS
    query_pos = db.query(
        VentaPOSItem.producto_id,
        Producto.nombre,
        func.sum(VentaPOSItem.cantidad).label("cantidad_vendida"),
        func.sum(VentaPOSItem.subtotal).label("monto_total")
    ).join(
        Producto, VentaPOSItem.producto_id == Producto.id
    ).join(
        VentaPOS, VentaPOSItem.venta_pos_id == VentaPOS.id  # ✅ CORREGIDO
    ).filter(
        VentaPOS.fecha_creacion >= fecha_inicio,
        VentaPOS.fecha_creacion <= fecha_fin,
        VentaPOS.estado.in_(["PAGADO", "COMPLETADO"]),
        VentaPOS.cancelado == False
    )
    
    if sucursal_id:
        query_pos = query_pos.filter(VentaPOS.sucursal_id == sucursal_id)
    
    productos_pos = query_pos.group_by(
        VentaPOSItem.producto_id, Producto.nombre
    ).order_by(
        desc("cantidad_vendida")
    ).limit(limit).all()
    
    productos_top = []
    
    for producto in productos_pos:
        # Obtener variantes más populares
        query_variantes = db.query(
            VentaPOSItem.variante_id,
            Variante.talla,
            Variante.color,
            func.sum(VentaPOSItem.cantidad).label("cantidad")
        ).join(
            Variante, VentaPOSItem.variante_id == Variante.id
        ).join(
            VentaPOS, VentaPOSItem.venta_pos_id == VentaPOS.id  # ✅ CORREGIDO
        ).filter(
            VentaPOSItem.producto_id == producto.producto_id,
            VentaPOS.fecha_creacion >= fecha_inicio,
            VentaPOS.fecha_creacion <= fecha_fin
        )
        
        if sucursal_id:
            query_variantes = query_variantes.filter(VentaPOS.sucursal_id == sucursal_id)
        
        variantes = query_variantes.group_by(
            VentaPOSItem.variante_id, Variante.talla, Variante.color
        ).order_by(
            desc("cantidad")
        ).limit(3).all()
        
        variantes_populares = [
            {
                "variante_id": v.variante_id,
                "talla": v.talla,
                "color": v.color,
                "cantidad": v.cantidad
            }
            for v in variantes
        ]
        
        productos_top.append({
            "producto_id": producto.producto_id,
            "nombre": producto.nombre,
            "cantidad_vendida": producto.cantidad_vendida,
            "monto_total": float(producto.monto_total),
            "variantes_populares": variantes_populares
        })
    
    return productos_top


def obtener_alertas_inventario(
    db: Session,
    umbral_minimo: int = 5,
    sucursal_id: Optional[int] = None
) -> List[dict]:
    """
    Obtiene alertas de inventario bajo.
    
    Returns:
        Lista de productos con stock bajo
    """
    query = db.query(
        Inventario.variante_id,
        Producto.nombre.label("producto_nombre"),
        Variante.talla,
        Variante.color,
        Inventario.sucursal_id,
        Sucursal.nombre.label("sucursal_nombre"),
        Inventario.cantidad.label("stock_actual"),
        Inventario.min_stock  # ✅ CORREGIDO
    ).join(
        Variante, Inventario.variante_id == Variante.id
    ).join(
        Producto, Variante.producto_id == Producto.id
    ).join(
        Sucursal, Inventario.sucursal_id == Sucursal.id
    ).filter(
        Inventario.cantidad <= Inventario.min_stock  # ✅ CORREGIDO
    )
    
    if sucursal_id:
        query = query.filter(Inventario.sucursal_id == sucursal_id)
    
    alertas = query.all()
    
    resultado = []
    for alerta in alertas:
        # Determinar nivel de alerta
        if alerta.stock_actual == 0:
            nivel = "CRITICO"
        elif alerta.stock_actual <= umbral_minimo:
            nivel = "CRITICO"
        elif alerta.stock_actual <= alerta.min_stock:  # ✅ CORREGIDO
            nivel = "BAJO"
        else:
            nivel = "MEDIO"
        
        resultado.append({
            "variante_id": alerta.variante_id,
            "producto_nombre": alerta.producto_nombre,
            "talla": alerta.talla,
            "color": alerta.color,
            "sucursal_id": alerta.sucursal_id,
            "sucursal_nombre": alerta.sucursal_nombre,
            "stock_actual": alerta.stock_actual,
            "stock_minimo": alerta.min_stock,  # ✅ CORREGIDO
            "nivel_alerta": nivel
        })
    
    return resultado


def obtener_desempeno_vendedores(
    db: Session,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    sucursal_id: Optional[int] = None,
    vendedor_id: Optional[int] = None
) -> List[dict]:
    """
    Obtiene métricas de desempeño por vendedor.
    
    Returns:
        Lista de vendedores con sus métricas
    """
    if not fecha_inicio:
        fecha_inicio = datetime.now() - timedelta(days=30)
    if not fecha_fin:
        fecha_fin = datetime.now()
    
    # Query principal de ventas por vendedor
    query = db.query(
        VentaPOS.vendedor_id,
        Usuario.nombre,
        func.sum(VentaPOS.total).label("ventas_totales"),
        func.count(VentaPOS.id).label("cantidad_ventas")
    ).join(
        Usuario, VentaPOS.vendedor_id == Usuario.id
    ).filter(
        VentaPOS.fecha_creacion >= fecha_inicio,
        VentaPOS.fecha_creacion <= fecha_fin,
        VentaPOS.estado.in_(["PAGADO", "COMPLETADO"]),
        VentaPOS.cancelado == False
    )
    
    if sucursal_id:
        query = query.filter(VentaPOS.sucursal_id == sucursal_id)
    
    if vendedor_id:
        query = query.filter(VentaPOS.vendedor_id == vendedor_id)
    
    vendedores = query.group_by(
        VentaPOS.vendedor_id, Usuario.nombre
    ).order_by(
        desc("ventas_totales")
    ).all()
    
    resultado = []
    ranking = 1
    
    for vendedor in vendedores:
        ticket_promedio = float(vendedor.ventas_totales) / vendedor.cantidad_ventas if vendedor.cantidad_ventas > 0 else 0
        
        # Obtener comisiones del vendedor
        comisiones_generadas = db.query(
            func.sum(ComisionVendedor.monto_comision)
        ).filter(
            ComisionVendedor.vendedor_id == vendedor.vendedor_id,
            ComisionVendedor.fecha_venta >= fecha_inicio,
            ComisionVendedor.fecha_venta <= fecha_fin
        ).scalar() or Decimal("0.00")
        
        comisiones_pendientes = db.query(
            func.sum(ComisionVendedor.monto_comision)
        ).filter(
            ComisionVendedor.vendedor_id == vendedor.vendedor_id,
            ComisionVendedor.estado == "PENDIENTE",
            ComisionVendedor.fecha_venta >= fecha_inicio,
            ComisionVendedor.fecha_venta <= fecha_fin
        ).scalar() or Decimal("0.00")
        
        comisiones_liquidadas = db.query(
            func.sum(ComisionVendedor.monto_comision)
        ).filter(
            ComisionVendedor.vendedor_id == vendedor.vendedor_id,
            ComisionVendedor.estado == "LIQUIDADA",
            ComisionVendedor.fecha_venta >= fecha_inicio,
            ComisionVendedor.fecha_venta <= fecha_fin
        ).scalar() or Decimal("0.00")
        
        resultado.append({
            "vendedor_id": vendedor.vendedor_id,
            "nombre": vendedor.nombre,
            "ventas_totales": float(vendedor.ventas_totales),
            "cantidad_ventas": vendedor.cantidad_ventas,
            "ticket_promedio": round(ticket_promedio, 2),
            "comisiones_generadas": float(comisiones_generadas),
            "comisiones_pendientes": float(comisiones_pendientes),
            "comisiones_liquidadas": float(comisiones_liquidadas),
            "ranking": ranking
        })
        
        ranking += 1
    
    return resultado