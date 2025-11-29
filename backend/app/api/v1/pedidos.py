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
)
from app.services.pedido_service import crear_pedido_desde_carrito

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