# backend/app/schemas/checkout.py
from pydantic import BaseModel

class CheckoutSummary(BaseModel):
    subtotal: float
    descuento_puntos: float
    total: float
    puntos_usados: int
    puntos_disponibles: int
    direccion_predeterminada: dict
    items: list

class CheckoutApplyPoints(BaseModel):
    cantidad: int