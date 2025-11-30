# backend/app/api/v1/pedidos.py
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.pedido import Pedido
from app.schemas.pedido import (
    PedidoCreateFromCart,
    PedidoRead,
    PedidoHistorialOut,   # ⬅️ nuevo import
    PedidoEstadoUpdate,      # ⬅️ nuevo
    PedidoEstadoResponse, 
)
from app.services.pedido_service import crear_pedido_desde_carrito, actualizar_estado_pedido

router = APIRouter()


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
