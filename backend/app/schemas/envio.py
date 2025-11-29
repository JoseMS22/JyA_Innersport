# backend/app/schemas/envio.py
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class MetodoEnvioBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_base: Decimal = Field(..., ge=0)
    costo_por_km: Optional[Decimal] = Field(None, ge=0)
    dias_entrega_min: int = Field(..., ge=0)
    dias_entrega_max: int = Field(..., ge=0)
    provincias_disponibles: Optional[List[str]] = None
    activo: bool = True


class MetodoEnvioCreate(MetodoEnvioBase):
    pass


class MetodoEnvioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    costo_base: Optional[Decimal] = Field(None, ge=0)
    costo_por_km: Optional[Decimal] = Field(None, ge=0)
    dias_entrega_min: Optional[int] = Field(None, ge=0)
    dias_entrega_max: Optional[int] = Field(None, ge=0)
    provincias_disponibles: Optional[List[str]] = None
    activo: Optional[bool] = None


class MetodoEnvioRead(MetodoEnvioBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CostoEnvioCalculado(BaseModel):
    """Respuesta con costo calculado y tiempo estimado"""
    metodo_envio_id: int
    metodo_nombre: str
    costo: Decimal
    dias_entrega_min: int
    dias_entrega_max: int
    fecha_estimada_min: date
    fecha_estimada_max: date
    descripcion: Optional[str] = None


class CalcularEnvioRequest(BaseModel):
    """Request para calcular costo de envío"""
    direccion_id: int
    peso_kg: Optional[Decimal] = Field(default=1, ge=0.1)
    metodo_envio_id: Optional[int] = None  # Si es None, devuelve todos los disponibles