# app/schemas/sucursal.py
from pydantic import BaseModel
from typing import Optional


class SucursalBase(BaseModel):
    nombre: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    provincia: str


class SucursalCreate(SucursalBase):
    pass


class SucursalUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    provincia: str
    activo: Optional[bool] = None


class SucursalRead(SucursalBase):
    id: int
    activo: bool

    class Config:
        from_attributes = True
