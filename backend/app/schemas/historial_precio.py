# app/schemas/historial_precio.py
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class HistorialPrecioRead(BaseModel):
    id: int
    variante_id: int
    precio: Decimal
    vigente_desde: datetime
    vigente_hasta: datetime | None = None

    class Config:
        from_attributes = True
