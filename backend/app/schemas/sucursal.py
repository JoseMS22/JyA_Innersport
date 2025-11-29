# app/schemas/sucursal.py
from pydantic import BaseModel
from typing import Optional


class SucursalBase(BaseModel):
    nombre: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None


class SucursalCreate(SucursalBase):
    pass


class SucursalUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None


class SucursalRead(SucursalBase):
    id: int
    activo: bool

    class Config:
        from_attributes = True
