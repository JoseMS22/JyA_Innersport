# app/schemas/inventario.py
from pydantic import BaseModel
from typing import Optional
from .sucursal import SucursalRead
from .variante import VarianteRead


class InventarioBase(BaseModel):
    variante_id: int
    sucursal_id: int
    cantidad: int
    min_stock: int = 0
    max_stock: Optional[int] = None


class InventarioRead(BaseModel):
    id: int
    variante_id: int
    sucursal_id: int
    cantidad: int
    min_stock: int
    max_stock: Optional[int] = None
    variante: Optional[VarianteRead] = None
    sucursal: Optional[SucursalRead] = None

    class Config:
        from_attributes = True


class AjusteInventarioRequest(BaseModel):
    variante_id: int
    sucursal_id: int
    tipo: str         # ENTRADA / SALIDA / AJUSTE
    cantidad: int     # siempre positiva
    motivo: Optional[str] = None
    referencia: Optional[str] = None
