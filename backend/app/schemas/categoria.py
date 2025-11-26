# app/schemas/categoria.py
from __future__ import annotations  # puedes dejarlo, no estorba

from pydantic import BaseModel, Field
from typing import Optional, List


class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class CategoriaCreate(CategoriaBase):
    principal: bool = False
    secundaria: bool = False
    principales_ids: Optional[list[int]] = None


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    principal: Optional[bool] = None
    secundaria: Optional[bool] = None
    principales_ids: Optional[list[int]] = None


# 🔹 Modelo "plano" SIN relaciones, para usar dentro de principales/secundarias
class CategoriaRelacionRead(BaseModel):
    id: int
    nombre: str
    activo: bool
    principal: bool
    secundaria: bool

    class Config:
        from_attributes = True


# 🔹 Modelo completo que devuelve el endpoint
class CategoriaRead(CategoriaBase):
    id: int
    activo: bool
    principal: bool
    secundaria: bool

    # OJO: aquí usamos el modelo plano, NO CategoriaRead
    principales: List[CategoriaRelacionRead] = Field(default_factory=list)
    secundarias: List[CategoriaRelacionRead] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CategoriaMenuRead(BaseModel):
    id: int
    nombre: str
    principal: bool
    secundaria: bool
    productos_count: int = 0 
    secundarias: List["CategoriaMenuRead"] = Field(default_factory=list)

    class Config:
        from_attributes = True
