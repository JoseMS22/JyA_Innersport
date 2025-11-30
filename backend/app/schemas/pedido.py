# backend/app/schemas/pedido.py
from decimal import Decimal
from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict

from typing import Literal

class PedidoItemResumen(BaseModel):
    variante_id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    # Pydantic v2: viene desde SQLAlchemy
    model_config = ConfigDict(from_attributes=True)


class PedidoCreateFromCart(BaseModel):
    direccion_envio_id: int
    metodo_pago: str


class PedidoRead(BaseModel):
    id: int
    cliente_id: int
    direccion_envio_id: int
    sucursal_id: int | None
    total: Decimal
    estado: str
    fecha_creacion: datetime

    items: List[PedidoItemResumen]

    pago_estado: str
    pago_metodo: str
    pago_referencia: str

    # Pydantic v2
    model_config = ConfigDict(from_attributes=True)


class PedidoHistorialOut(BaseModel):
    id: int
    total: Decimal
    estado: str
    fecha_creacion: datetime
    sucursal_id: int | None

    # Pydantic v2
    model_config = ConfigDict(from_attributes=True)

class PedidoEstadoUpdate(BaseModel):
    """
    Payload de entrada para cambiar el estado del pedido.
    """
    estado: Literal[
        "PAGADO",
        "EN_PREPARACION",
        "ENVIADO",
        "ENTREGADO",
        "CANCELADO",
    ]


class PedidoEstadoResponse(BaseModel):
    """
    Respuesta simplificada cuando se actualiza el estado.
    """
    id: int
    estado: str
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)