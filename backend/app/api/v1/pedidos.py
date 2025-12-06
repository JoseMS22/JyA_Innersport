# backend/app/api/v1/pedidos.py
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.pedido import Pedido
from app.schemas.pedido import (
    PedidoCreateFromCart,
    PedidoRead,
    PedidoHistorialOut,
    PedidoEstadoUpdate,
    PedidoEstadoResponse,
    CancelarPedidoRequest,
    ImpactoCancelacionResponse,
    CancelarPedidoResponse,
)

from app.services.pedido_service import (
    crear_pedido_desde_carrito,
    actualizar_estado_pedido,
)
from app.services.cancelar_pedido_service import (
    verificar_puede_cancelar_pedido,
    cancelar_pedido,
)

router = APIRouter()

def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
  if current_user.rol != "ADMIN":
      raise HTTPException(status_code=403, detail="Solo administradores")
  return current_user

def get_client_ip(request: Request) -> str:
    """Obtiene la IP del cliente desde el request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

@router.get("/admin", response_model=List[PedidoHistorialOut])
def listar_pedidos_admin(
    estado: Optional[str] = Query(None, description="Estado del pedido"),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin),
):
    """
    Lista pedidos para el panel admin.
    - Puede filtrar por estado (PAGADO, EN_PREPARACION, ENVIADO, ENTREGADO, CANCELADO)
    - Si `estado` es None -> trae todos.
    """
    query = (
        db.query(Pedido)
        .options(joinedload(Pedido.sucursal))  # 👈 para traer también la sucursal
        .order_by(Pedido.fecha_creacion.desc())
    )

    if estado:
        query = query.filter(Pedido.estado == estado)

    pedidos = query.all()

    # 👇 Construimos la respuesta incluyendo sucursal_nombre
    return [
        PedidoHistorialOut(
            id=p.id,
            total=p.total,
            estado=p.estado,
            fecha_creacion=p.fecha_creacion,
            sucursal_id=p.sucursal_id,
            sucursal_nombre=p.sucursal.nombre if p.sucursal else None,
            cancelado=p.cancelado,
            numero_pedido=p.numero_pedido,
        )
        for p in pedidos
    ]

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


@router.patch("/{pedido_id}/estado", response_model=PedidoEstadoResponse)
def cambiar_estado_pedido(
    pedido_id: int,
    data: PedidoEstadoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cambia el estado de un pedido y envía un correo al cliente.

    ⚠️ IMPORTANTE:
    Más adelante deberías restringir este endpoint solo a usuarios
    con rol de ADMIN / VENDEDOR o similar.
    """
    return actualizar_estado_pedido(
        db=db,
        pedido_id=pedido_id,
        nuevo_estado=data.estado,
        usuario_actual=current_user,
    )


@router.get("/{pedido_id}", response_model=dict)
def obtener_detalle_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Obtener detalles completos de un pedido específico
    """
    query = db.query(Pedido).filter(Pedido.id == pedido_id)

    if current_user.rol != "ADMIN":
        query = query.filter(Pedido.cliente_id == current_user.id)

    pedido = query.first()

    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Productos del pedido (usando PedidoItem y relaciones)
    productos = []
    for item in pedido.items:
        imagen_url = ""
        if item.producto and hasattr(item.producto, "media"):
            medias = item.producto.media
            if medias and len(medias) > 0:
                imagen_url = getattr(medias[0], "url", "")

        productos.append(
            {
                "id": item.id,
                "nombre": item.producto.nombre if item.producto else "Producto eliminado",
                "imagen_url": imagen_url,
                "precio_unitario": float(item.precio_unitario),
                "cantidad": item.cantidad,
                "subtotal": float(item.subtotal),
                "impuesto": float(getattr(item, "impuesto", 0) or 0),
            }
        )

        # Calcular impuesto total del pedido (suma de los ítems)
    impuesto_total = sum(
        float(getattr(it, "impuesto", 0) or 0) for it in pedido.items
    )


    # Datos de dirección de envío
    direccion_data = {}
    if pedido.direccion_envio:
        direccion_data = {
            "provincia": pedido.direccion_envio.provincia,
            "canton": pedido.direccion_envio.canton,
            "distrito": pedido.direccion_envio.distrito,
            "detalle": pedido.direccion_envio.detalle,
            "pais": pedido.direccion_envio.pais or "Costa Rica",
            "codigo_postal": pedido.direccion_envio.codigo_postal or "",
            "telefono": pedido.direccion_envio.telefono or "",
            "nombre": pedido.direccion_envio.nombre or "",
            "referencia": pedido.direccion_envio.referencia or "",
        }

    # Verificar si puede cancelar (ejemplo: solo ciertos estados / tiempo)
    puede_cancelar = False
    fecha_limite = None

    if pedido.estado in ["PENDIENTE", "CONFIRMADO"]:
        fecha_limite = pedido.fecha_creacion + timedelta(hours=24)
        puede_cancelar = datetime.now() < fecha_limite

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
        "impuesto_total": impuesto_total,
        "puede_cancelar": puede_cancelar,
        "fecha_limite_cancelacion": fecha_limite.isoformat() if fecha_limite else None,
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
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()

    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if current_user.rol != "ADMIN" and pedido.cliente_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para ver este pedido",
        )

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
    """
    ip_address = get_client_ip(request)

    return cancelar_pedido(
        db=db,
        pedido_id=pedido_id,
        motivo=data.motivo,
        usuario=current_user,
        ip_address=ip_address,
    )
