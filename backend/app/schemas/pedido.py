# backend/app/schemas/pedido.py
from decimal import Decimal
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PedidoItemResumen(BaseModel):
    variante_id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class PedidoCreateFromCart(BaseModel):
    direccion_envio_id: int
    metodo_pago: str


class PedidoRead(BaseModel):
    id: int
    cliente_id: int
    direccion_envio_id: int
    total: Decimal
    estado: str
    fecha_creacion: datetime
    cancelado: bool = False
    motivo_cancelacion: Optional[str] = None
    fecha_cancelacion: Optional[datetime] = None

    items: List[PedidoItemResumen]

    pago_estado: str
    pago_metodo: str
    pago_referencia: str

    model_config = ConfigDict(from_attributes=True)


class PedidoHistorialOut(BaseModel):
    id: int
    total: Decimal
    estado: str
    fecha_creacion: datetime
    cancelado: bool = False

    model_config = ConfigDict(from_attributes=True)


# ============================
# Schemas para cancelación
# ============================

class CancelarPedidoRequest(BaseModel):
    """
    Request para cancelar un pedido
    """
    motivo: str = Field(
        ..., 
        min_length=10, 
        max_length=500,
        description="Motivo de la cancelación (mínimo 10 caracteres)"
    )


class ImpactoCancelacionResponse(BaseModel):
    """
    Información sobre el impacto de cancelar un pedido
    """
    puede_cancelar: bool
    motivo_bloqueo: Optional[str] = None
    advertencias: List[str] = Field(default_factory=list)
    impacto_stock: bool = False
    mensaje: str


class CancelarPedidoResponse(BaseModel):
    """
    Respuesta después de cancelar un pedido
    """
    success: bool
    mensaje: str
    pedido_id: int
    nuevo_estado: str
    stock_reintegrado: bool = False
    items_reintegrados: int = 0