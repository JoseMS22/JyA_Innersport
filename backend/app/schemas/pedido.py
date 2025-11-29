# backend/app/schemas/pedido.py
from decimal import Decimal
from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


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

    # Pydantic v2
    model_config = ConfigDict(from_attributes=True)