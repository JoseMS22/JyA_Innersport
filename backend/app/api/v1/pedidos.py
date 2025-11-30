# backend/app/api/v1/pedidos.py
from typing import List
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.pedido import Pedido
from app.schemas.pedido import (
    PedidoCreateFromCart,
    PedidoRead,
    PedidoHistorialOut,
    CancelarPedidoRequest,
    ImpactoCancelacionResponse,
    CancelarPedidoResponse,
)
from app.services.pedido_service import crear_pedido_desde_carrito
from app.services.cancelar_pedido_service import (
    verificar_puede_cancelar_pedido,
    cancelar_pedido,
)

router = APIRouter()


def get_client_ip(request: Request) -> str:
    """Obtiene la IP del cliente desde el request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/checkout", response_model=PedidoRead)
def crear_pedido_checkout(
    data: PedidoCreateFromCart,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea un Pedido a partir del carrito actual del usuario y
    registra un Pago simulado automáticamente aprobado.
    """
    return crear_pedido_desde_carrito(db, current_user.id, data)


# ====================================================================
# IMPORTANTE: Rutas específicas DEBEN ir ANTES de rutas con parámetros
# ====================================================================

@router.get("/mis-pedidos", response_model=List[PedidoHistorialOut])
def listar_mis_pedidos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve el historial de pedidos del usuario autenticado.
    Solo datos resumidos: id, total, estado, fecha_creacion.
    """
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.cliente_id == current_user.id)
        .order_by(Pedido.fecha_creacion.desc())
        .all()
    )
    return pedidos


@router.get("/{pedido_id}", response_model=dict)
def obtener_detalle_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtener detalles completos de un pedido específico
    """
    # Buscar el pedido con todas sus relaciones cargadas
    pedido = (
        db.query(Pedido)
        .filter(
            Pedido.id == pedido_id,
            Pedido.cliente_id == current_user.id
        )
        .first()
    )
    
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Construir lista de productos desde los items del pedido
    productos = []
    for item in pedido.items:
        productos.append({
            "id": item.id,
            "nombre": item.producto.nombre if item.producto else "Producto eliminado",
            "imagen_url": item.producto.imagen_url if item.producto else "",
            "precio_unitario": float(item.precio_unitario),
            "cantidad": item.cantidad,
            "subtotal": float(item.subtotal)
        })
    
    # Datos de dirección de envío
    direccion_data = {}
    if pedido.direccion_envio:
        direccion_data = {
            "provincia": pedido.direccion_envio.provincia,
            "canton": pedido.direccion_envio.canton,
            "distrito": pedido.direccion_envio.distrito,
            "direccion_exacta": pedido.direccion_envio.direccion_exacta,
            "telefono": pedido.direccion_envio.telefono or "",
            "nombre_contacto": pedido.direccion_envio.nombre_contacto or ""
        }
    
    # Verificar si puede cancelar (dentro de 24 horas y estado permitido)
    puede_cancelar = False
    fecha_limite = None
    
    if pedido.estado in ["PENDIENTE", "CONFIRMADO"]:
        fecha_limite = pedido.fecha_creacion + timedelta(hours=24)
        puede_cancelar = datetime.now() < fecha_limite
    
    # Construir respuesta
    return {
        "id": pedido.id,
        "numero_pedido": pedido.numero_pedido,
        "fecha": pedido.fecha_creacion.isoformat(),
        "estado": pedido.estado,
        "subtotal": float(pedido.subtotal),
        "costo_envio": float(pedido.costo_envio or 0),
        "descuento_puntos": float(pedido.descuento_puntos or 0),
        "total": float(pedido.total),
        "puntos_ganados": pedido.puntos_ganados or 0,
        "metodo_envio": pedido.metodo_envio or "Envío Estándar",
        "direccion_envio": direccion_data,
        "productos": productos,
        "puede_cancelar": puede_cancelar,
        "fecha_limite_cancelacion": fecha_limite.isoformat() if fecha_limite else None
    }


# ============================
# US-26: Cancelar Pedido
# ============================

@router.get(
    "/{pedido_id}/verificar-cancelacion",
    response_model=ImpactoCancelacionResponse,
)
def verificar_cancelacion_pedido(
    pedido_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    US-26: Verifica si un pedido puede ser cancelado y muestra
    advertencias sobre el impacto (reembolsos, stock, etc).
    
    Este endpoint debe llamarse ANTES de confirmar la cancelación
    para mostrar al usuario las consecuencias.
    """
    # Obtener pedido
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    
    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )
    
    # Verificar permisos
    if current_user.rol != "ADMIN" and pedido.cliente_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para ver este pedido"
        )
    
    # Verificar y retornar impacto
    return verificar_puede_cancelar_pedido(db, pedido)


@router.post(
    "/{pedido_id}/cancelar",
    response_model=CancelarPedidoResponse,
)
def cancelar_pedido_endpoint(
    pedido_id: int,
    data: CancelarPedidoRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    US-26: Cancela un pedido.
    
    Criterios de aceptación:
    - ✅ Solo cancela si no fue despachado o entregado
    - ✅ Muestra advertencia de impacto antes (endpoint /verificar-cancelacion)
    - ✅ Actualiza estado a CANCELADO y reintegra stock cuando aplique
    - ✅ Registra auditoría con usuario, motivo, timestamp
    
    La notificación al cliente/admin se implementará posteriormente
    con el sistema de notificaciones.
    """
    ip_address = get_client_ip(request)
    
    return cancelar_pedido(
        db=db,
        pedido_id=pedido_id,
        motivo=data.motivo,
        usuario=current_user,
        ip_address=ip_address,
    )