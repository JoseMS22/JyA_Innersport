# backend/app/schemas/direccion.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, validator


class DireccionBase(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100, description="Nombre descriptivo (ej: Casa, Trabajo)")
    pais: str = Field(default="Costa Rica", max_length=80)
    provincia: str = Field(..., max_length=80)
    canton: str = Field(..., max_length=80)
    distrito: str = Field(..., max_length=80)
    detalle: str = Field(..., max_length=200, description="Dirección exacta")
    codigo_postal: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=30)
    referencia: Optional[str] = Field(None, max_length=200, description="Referencias adicionales")
    
    @validator('provincia', 'canton', 'distrito', 'detalle')
    def no_empty_strings(cls, v, field):
        if not v or not v.strip():
            raise ValueError(f'{field.name} no puede estar vacío')
        return v.strip()


class DireccionCreate(DireccionBase):
    predeterminada: bool = False


class DireccionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    pais: Optional[str] = Field(None, max_length=80)
    provincia: Optional[str] = Field(None, max_length=80)
    canton: Optional[str] = Field(None, max_length=80)
    distrito: Optional[str] = Field(None, max_length=80)
    detalle: Optional[str] = Field(None, max_length=200)
    codigo_postal: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=30)
    referencia: Optional[str] = Field(None, max_length=200)
    predeterminada: Optional[bool] = None


class DireccionRead(DireccionBase):
    id: int
    usuario_id: int
    predeterminada: bool
    activa: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)