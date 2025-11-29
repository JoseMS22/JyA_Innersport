# app/schemas/producto.py
from pydantic import BaseModel
from typing import Optional, List
from .media import MediaRead
from .categoria import CategoriaRead

class ProductoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class ProductoCreate(ProductoBase):
    categorias_ids: List[int] = []   # lista de categorías asociadas

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    categorias_ids: Optional[List[int]] = None

class ProductoRead(ProductoBase):
    id: int
    activo: bool
    categorias: List[CategoriaRead] = []
    media: List[MediaRead] = []

    class Config:
        from_attributes = True

class ProductoMini(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True
