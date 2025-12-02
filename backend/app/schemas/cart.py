# app/schemas/cart.py
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class CartItemFromApi(BaseModel):
    variante_id: int
    producto_id: int
    nombre_producto: str
    marca: Optional[str] = None
    sku: Optional[str] = None
    color: Optional[str] = None
    talla: Optional[str] = None
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal
    imagen_url: Optional[str] = None

    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    items: List[CartItemFromApi]
    total_items: int
    total: Decimal


class CartItemCreate(BaseModel):
    variante_id: int
    cantidad: int = 1


class CartItemUpdate(BaseModel):
    cantidad: int