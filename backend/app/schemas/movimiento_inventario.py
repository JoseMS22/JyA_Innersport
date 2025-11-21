# app/schemas/movimiento_inventario.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MovimientoInventarioRead(BaseModel):
    id: int
    variante_id: int
    sucursal_id: int
    cantidad: int
    tipo: str
    source_type: Optional[str] = None
    referencia: Optional[str] = None
    observacion: Optional[str] = None
    usuario_id: Optional[int] = None
    fecha: datetime

    class Config:
        from_attributes = True
