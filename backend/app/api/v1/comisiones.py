# backend/app/api/v1/comisiones.py
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal
import csv
import io
from sqlalchemy import func
from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.configuracion_comision import ConfiguracionComision
from app.models.comision_vendedor import ComisionVendedor
from app.models.sucursal import Sucursal
from app.models.venta_pos import VentaPOS

from app.schemas.dashboard import (
    ConfiguracionComisionCreate,
    ConfiguracionComisionOut,
    ConfiguracionComisionesResponse,
    ComisionesVendedorResponse,
    LiquidarComisionesRequest,
    LiquidarComisionesResponse,
    CalcularComisionesRequest,
    CalcularComisionesResponse,
    ComisionVendedorOut,
    VendedorInfo,
    ResumenComisionesVendedor,
    PaginationInfo,
)

from app.services.comisiones_service import (
    obtener_configuracion_activa,
    calcular_comisiones_periodo,
    liquidar_comisiones,
    obtener_comisiones_vendedor,
    obtener_resumen_comisiones_vendedor,
)


router = APIRouter()


# ✅ FUNCIÓN AUXILIAR PARA PARSEAR FECHAS
def parse_date_from_iso(date_str: str) -> date:
    """
    Convierte string ISO (con o sin timezone) a objeto date.
    Acepta: '2025-11-30' o '2025-11-30T01:33:14.183Z'
    """
    try:
        # Si viene con timezone Z, reemplazar por +00:00
        if 'T' in date_str:
            date_str_cleaned = date_str.replace('Z', '+00:00')
            dt = datetime.fromisoformat(date_str_cleaned)
            return dt.date()
        else:
            # Formato simple YYYY-MM-DD
            return date.fromisoformat(date_str)
    except (ValueError, AttributeError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Formato de fecha inválido: {date_str}. Use formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS.sssZ)"
        )


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Requiere rol ADMIN"""
    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Solo los administradores pueden gestionar comisiones"
        )
    return current_user


# ============================
# CONFIGURACIÓN DE COMISIONES
# ============================

@router.get("/configuracion", response_model=ConfiguracionComisionesResponse)
def get_configuracion_comisiones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene todas las configuraciones de comisiones activas.
    """
    configuraciones = db.query(ConfiguracionComision).filter(
        ConfiguracionComision.activo == True
    ).order_by(ConfiguracionComision.tipo_venta).all()
    
    return {"configuraciones": configuraciones}


@router.post("/configuracion", response_model=ConfiguracionComisionOut, status_code=status.HTTP_201_CREATED)
def create_configuracion_comision(
    data: ConfiguracionComisionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Crea o actualiza configuración de comisiones.
    
    Si existe una configuración para ese tipo de venta,
    la actualiza. Si no existe, crea una nueva.
    """
    from sqlalchemy import exc
    
    # Buscar si ya existe configuración para este tipo de venta
    config_existente = db.query(ConfiguracionComision).filter(
        ConfiguracionComision.tipo_venta == data.tipo_venta
    ).first()
    
    if config_existente:
        # ✅ ACTUALIZAR la configuración existente
        config_existente.porcentaje = data.porcentaje
        config_existente.monto_minimo = data.monto_minimo
        config_existente.activo = True
        config_existente.fecha_actualizacion = func.now()
        
        db.add(config_existente)
        db.commit()
        db.refresh(config_existente)
        
        return config_existente
    else:
        # ✅ CREAR nueva configuración
        nueva_config = ConfiguracionComision(
            tipo_venta=data.tipo_venta,
            porcentaje=data.porcentaje,
            monto_minimo=data.monto_minimo,
            activo=True
        )
        
        db.add(nueva_config)
        db.commit()
        db.refresh(nueva_config)
        
        return nueva_config


# ============================
# COMISIONES POR VENDEDOR
# ============================

@router.get("/vendedor/{vendedor_id}", response_model=ComisionesVendedorResponse)
def get_comisiones_vendedor(
    vendedor_id: int,
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    estado: Optional[str] = Query("TODOS"),
    tipo_venta: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene comisiones de un vendedor específico con filtros.
    """
    # Validar que el vendedor existe
    vendedor = db.query(Usuario).filter(Usuario.id == vendedor_id).first()
    if not vendedor:
        raise HTTPException(
            status_code=404,
            detail="Vendedor no encontrado"
        )
    
    # ✅ Convertir fechas con el nuevo parser
    fecha_inicio_date = None
    fecha_fin_date = None
    
    if fecha_inicio:
        fecha_inicio_date = parse_date_from_iso(fecha_inicio)
    
    if fecha_fin:
        fecha_fin_date = parse_date_from_iso(fecha_fin)
    
    # Obtener comisiones
    comisiones, total = obtener_comisiones_vendedor(
        db=db,
        vendedor_id=vendedor_id,
        fecha_inicio=fecha_inicio_date,
        fecha_fin=fecha_fin_date,
        estado=estado,
        tipo_venta=tipo_venta,
        page=page,
        per_page=per_page
    )
    
    # Obtener resumen
    resumen = obtener_resumen_comisiones_vendedor(db, vendedor_id)
    
    # Construir respuesta
    comisiones_out = []
    for comision in comisiones:
        # Obtener nombre de sucursal
        sucursal_nombre = None
        if comision.venta_pos_id:  # ✅ CORREGIDO
            venta = db.query(VentaPOS).options(
                joinedload(VentaPOS.sucursal)
            ).filter(VentaPOS.id == comision.venta_pos_id).first()
            if venta and venta.sucursal:
                sucursal_nombre = venta.sucursal.nombre
        
        comisiones_out.append(
            ComisionVendedorOut(
                id=comision.id,
                venta_id=comision.venta_pos_id,  # ✅ CORREGIDO
                pedido_id=comision.pedido_id,
                monto_venta=comision.monto_venta,
                porcentaje_aplicado=comision.porcentaje_aplicado,
                monto_comision=comision.monto_comision,
                tipo_venta=comision.tipo_venta,
                estado=comision.estado,
                fecha_venta=comision.fecha_venta,
                sucursal_nombre=sucursal_nombre
            )
        )
    
    total_pages = (total + per_page - 1) // per_page
    
    return ComisionesVendedorResponse(
        vendedor=VendedorInfo(id=vendedor.id, nombre=vendedor.nombre),
        resumen=ResumenComisionesVendedor(**resumen),
        comisiones=comisiones_out,
        pagination=PaginationInfo(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    )


@router.get("/listar")
def listar_todas_comisiones(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    vendedor_id: Optional[int] = Query(None),
    estado: Optional[str] = Query("TODOS"),
    tipo_venta: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Lista todas las comisiones con filtros.
    Útil para la vista general de comisiones.
    """
    query = db.query(ComisionVendedor).options(
        joinedload(ComisionVendedor.vendedor),
        joinedload(ComisionVendedor.venta_pos).joinedload(VentaPOS.sucursal)
    )
    
    # ✅ Filtros con nuevo parser de fechas
    if fecha_inicio:
        fecha_inicio_date = parse_date_from_iso(fecha_inicio)
        query = query.filter(ComisionVendedor.fecha_venta >= fecha_inicio_date)
    
    if fecha_fin:
        fecha_fin_date = parse_date_from_iso(fecha_fin)
        query = query.filter(ComisionVendedor.fecha_venta <= fecha_fin_date)
    
    if vendedor_id:
        query = query.filter(ComisionVendedor.vendedor_id == vendedor_id)
    
    if estado and estado != "TODOS":
        query = query.filter(ComisionVendedor.estado == estado)
    
    if tipo_venta:
        query = query.filter(ComisionVendedor.tipo_venta == tipo_venta)
    
    # Contar total
    total = query.count()
    
    # Aplicar paginación
    comisiones = query.order_by(
        ComisionVendedor.fecha_venta.desc()
    ).offset((page - 1) * per_page).limit(per_page).all()
    
    # Construir respuesta
    comisiones_out = []
    for comision in comisiones:
        sucursal_nombre = None
        if comision.venta_pos and comision.venta_pos.sucursal:
            sucursal_nombre = comision.venta_pos.sucursal.nombre
        
        comisiones_out.append({
            "id": comision.id,
            "vendedor_id": comision.vendedor_id,
            "vendedor_nombre": comision.vendedor.nombre if comision.vendedor else "Desconocido",
            "venta_id": comision.venta_pos_id,  # ✅ CORREGIDO
            "pedido_id": comision.pedido_id,
            "monto_venta": float(comision.monto_venta),
            "porcentaje_aplicado": float(comision.porcentaje_aplicado),
            "monto_comision": float(comision.monto_comision),
            "tipo_venta": comision.tipo_venta,
            "estado": comision.estado,
            "fecha_venta": comision.fecha_venta.isoformat(),
            "sucursal_nombre": sucursal_nombre
        })
    
    total_pages = (total + per_page - 1) // per_page
    
    return {
        "comisiones": comisiones_out,
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
    }


# ============================
# LIQUIDAR COMISIONES
# ============================

@router.post("/liquidar", response_model=LiquidarComisionesResponse)
def liquidar_comisiones_vendedor(
    data: LiquidarComisionesRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Liquida comisiones pendientes de un vendedor.
    
    - Valida que todas las comisiones sean del vendedor
    - Valida estado PENDIENTE
    - Crea registro de liquidación
    - Actualiza estado de comisiones a LIQUIDADA
    """
    try:
        liquidacion, ids_liquidados = liquidar_comisiones(
            db=db,
            vendedor_id=data.vendedor_id,
            comisiones_ids=data.comisiones_ids,
            usuario_liquidador=current_user,
            periodo_inicio=data.periodo_inicio,
            periodo_fin=data.periodo_fin,
            metodo_pago=data.metodo_pago,
            referencia_pago=data.referencia_pago,
            observaciones=data.observaciones
        )
        
        return LiquidarComisionesResponse(
            liquidacion_id=liquidacion.id,
            vendedor_id=liquidacion.vendedor_id,
            monto_total=liquidacion.monto_total,
            cantidad_comisiones=liquidacion.cantidad_ventas,
            fecha_liquidacion=liquidacion.fecha_liquidacion,
            comisiones_liquidadas=ids_liquidados
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================
# CALCULAR COMISIONES
# ============================

@router.post("/calcular", response_model=CalcularComisionesResponse)
def calcular_comisiones_automatico(
    data: CalcularComisionesRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Calcula comisiones pendientes automáticamente para un período.
    
    - Busca ventas POS y pedidos sin comisión calculada
    - Aplica configuración de comisiones activa
    - Crea registros de comisiones pendientes
    """
    resultado = calcular_comisiones_periodo(
        db=db,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        vendedor_id=data.vendedor_id,
        tipo_venta=data.tipo_venta
    )
    
    return CalcularComisionesResponse(**resultado)


# ============================
# EXPORTAR REPORTES
# ============================

@router.get("/reporte/exportar")
def exportar_reporte_comisiones(
    formato: str = Query(..., regex="^(csv|pdf)$"),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    vendedor_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Exporta reporte de comisiones en formato CSV o PDF.
    """
    # Construir query
    query = db.query(ComisionVendedor).options(
        joinedload(ComisionVendedor.vendedor),
        joinedload(ComisionVendedor.venta_pos).joinedload(VentaPOS.sucursal)
    )
    
    # ✅ Filtros con nuevo parser de fechas
    if fecha_inicio:
        fecha_inicio_date = parse_date_from_iso(fecha_inicio)
        query = query.filter(ComisionVendedor.fecha_venta >= fecha_inicio_date)
    
    if fecha_fin:
        fecha_fin_date = parse_date_from_iso(fecha_fin)
        query = query.filter(ComisionVendedor.fecha_venta <= fecha_fin_date)
    
    if vendedor_id:
        query = query.filter(ComisionVendedor.vendedor_id == vendedor_id)
    
    if estado:
        query = query.filter(ComisionVendedor.estado == estado)
    
    comisiones = query.order_by(ComisionVendedor.fecha_venta.desc()).all()
    
    if formato == "csv":
        # Generar CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "ID",
            "Vendedor",
            "Fecha Venta",
            "Tipo Venta",
            "Monto Venta",
            "Porcentaje",
            "Monto Comisión",
            "Estado",
            "Sucursal"
        ])
        
        # Datos
        for comision in comisiones:
            sucursal = ""
            if comision.venta_pos and comision.venta_pos.sucursal:
                sucursal = comision.venta_pos.sucursal.nombre
            
            writer.writerow([
                comision.id,
                comision.vendedor.nombre if comision.vendedor else "Desconocido",
                comision.fecha_venta.strftime("%Y-%m-%d"),
                comision.tipo_venta,
                float(comision.monto_venta),
                float(comision.porcentaje_aplicado),
                float(comision.monto_comision),
                comision.estado,
                sucursal
            ])
        
        # Preparar respuesta
        output.seek(0)
        filename = f"comisiones_{date.today().isoformat()}.csv"
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    elif formato == "pdf":
        # TODO: Implementar generación de PDF con reportlab
        raise HTTPException(
            status_code=501,
            detail="Exportación a PDF no implementada aún"
        )