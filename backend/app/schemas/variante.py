# backend/app/schemas/variante.py
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from .historial_precio import HistorialPrecioRead


class VarianteBase(BaseModel):
    sku: str
    barcode: Optional[str] = None
    marca: Optional[str] = None  # 🆕 Campo marca
    color: Optional[str] = None
    talla: Optional[str] = None
    precio_actual: Decimal


class VarianteCreate(VarianteBase):
    pass


class VarianteUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    marca: Optional[str] = None  # 🆕
    color: Optional[str] = None
    talla: Optional[str] = None
    precio_actual: Optional[Decimal] = None
    activo: Optional[bool] = None


class VarianteRead(VarianteBase):
    id: int
    producto_id: int
    activo: bool
    historial_precios: List[HistorialPrecioRead] = []

    class Config:
        from_attributes = True


class CambioPrecioRequest(BaseModel):
    nuevo_precio: Decimal