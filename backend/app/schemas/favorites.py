from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class FavoriteFromApi(BaseModel):
    variante_id: int
    producto_id: int
    nombre_producto: str
    marca: Optional[str] = None
    precio: Decimal
    imagen_url: Optional[str] = None
    color: Optional[str] = None
    talla: Optional[str] = None

    class Config:
        from_attributes = True


class FavoritesResponse(BaseModel):
    items: List[FavoriteFromApi]


class ToggleFavoriteRequest(BaseModel):
    variante_id: int