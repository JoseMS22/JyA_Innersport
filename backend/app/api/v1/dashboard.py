# backend/app/api/v1/dashboard.py
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.dashboard import (
    MetricasDashboard,
    ProductosTopResponse,
    AlertasInventarioResponse,
    DesempenoVendedoresResponse,
)
from app.services.dashboard_service import (
    obtener_metricas_dashboard,
    obtener_productos_top,
    obtener_alertas_inventario,
    obtener_desempeno_vendedores,
)
from app.models.venta_pos import VentaPOS


router = APIRouter()


def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Requiere rol ADMIN para acceder al dashboard"""
    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Solo los administradores pueden acceder al dashboard"
        )
    return current_user


@router.get("/metricas", response_model=MetricasDashboard)
def get_metricas_dashboard(
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio (ISO format)"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin (ISO format)"),
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene métricas generales del dashboard.
    
    - Ventas totales con variación porcentual
    - Pedidos activos por estado
    - Ticket promedio
    - Ventas por canal (POS/Online)
    """
    # Convertir strings a datetime si vienen
    fecha_inicio_dt = None
    fecha_fin_dt = None
    
    if fecha_inicio:
        fecha_inicio_dt = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    
    if fecha_fin:
        fecha_fin_dt = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    
    metricas = obtener_metricas_dashboard(
        db=db,
        fecha_inicio=fecha_inicio_dt,
        fecha_fin=fecha_fin_dt,
        sucursal_id=sucursal_id
    )
    
    return metricas


@router.get("/productos-top", response_model=ProductosTopResponse)
def get_productos_top(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene los productos más vendidos con variantes populares.
    """
    fecha_inicio_dt = None
    fecha_fin_dt = None
    
    if fecha_inicio:
        fecha_inicio_dt = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    
    if fecha_fin:
        fecha_fin_dt = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    
    productos = obtener_productos_top(
        db=db,
        fecha_inicio=fecha_inicio_dt,
        fecha_fin=fecha_fin_dt,
        sucursal_id=sucursal_id,
        limit=limit
    )
    
    return {"productos": productos}


@router.get("/alertas-inventario", response_model=AlertasInventarioResponse)
def get_alertas_inventario(
    umbral_minimo: int = Query(5, ge=0, le=100),
    sucursal_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene alertas de inventario bajo.
    """
    alertas = obtener_alertas_inventario(
        db=db,
        umbral_minimo=umbral_minimo,
        sucursal_id=sucursal_id
    )
    
    return {
        "alertas": alertas,
        "total_alertas": len(alertas)
    }


@router.get("/desempeno-vendedores", response_model=DesempenoVendedoresResponse)
def get_desempeno_vendedores(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    vendedor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene métricas de desempeño por vendedor.
    
    - Ventas totales y cantidad
    - Ticket promedio
    - Comisiones (generadas, pendientes, liquidadas)
    - Ranking
    """
    fecha_inicio_dt = None
    fecha_fin_dt = None
    
    if fecha_inicio:
        fecha_inicio_dt = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    
    if fecha_fin:
        fecha_fin_dt = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    
    vendedores = obtener_desempeno_vendedores(
        db=db,
        fecha_inicio=fecha_inicio_dt,
        fecha_fin=fecha_fin_dt,
        sucursal_id=sucursal_id,
        vendedor_id=vendedor_id
    )
    
    return {"vendedores": vendedores}

@router.get("/ventas-historico")
def get_ventas_historico(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin)
):
    """
    Obtiene datos históricos de ventas agrupados por día.
    """
    from datetime import timedelta
    from sqlalchemy import func
    
    fecha_inicio_dt = None
    fecha_fin_dt = None
    
    if fecha_inicio:
        fecha_inicio_dt = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    else:
        fecha_inicio_dt = datetime.now() - timedelta(days=30)
    
    if fecha_fin:
        fecha_fin_dt = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    else:
        fecha_fin_dt = datetime.now()
    
    # Query base
    query = db.query(
        func.date(VentaPOS.fecha_creacion).label("fecha"),
        func.sum(VentaPOS.total).label("total"),
        func.count(VentaPOS.id).label("cantidad")
    ).filter(
        VentaPOS.fecha_creacion >= fecha_inicio_dt,
        VentaPOS.fecha_creacion <= fecha_fin_dt,
        VentaPOS.estado.in_(["PAGADO", "COMPLETADO"]),
        VentaPOS.cancelado == False
    )
    
    if sucursal_id:
        query = query.filter(VentaPOS.sucursal_id == sucursal_id)
    
    # Agrupar por fecha
    ventas = query.group_by(func.date(VentaPOS.fecha_creacion)).order_by("fecha").all()
    
    # Formatear respuesta
    datos = [
        {
            "fecha": venta.fecha.isoformat(),
            "total": float(venta.total),
            "cantidad": venta.cantidad
        }
        for venta in ventas
    ]
    
    return {"datos": datos}