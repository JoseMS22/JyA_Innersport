# backend/app/schemas/auditoria.py

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditoriaBase(BaseModel):
    """Schema base para auditoría."""
    accion: str
    entidad: str
    entidad_id: Optional[int] = None
    detalles: Optional[str] = None
    ip_address: Optional[str] = None


class AuditoriaCreate(AuditoriaBase):
    """Schema para crear registro de auditoría."""
    usuario_id: int


class AuditoriaPublic(AuditoriaBase):
    """Schema público para auditoría."""
    id: int
    usuario_id: Optional[int]
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditoriaConUsuario(AuditoriaPublic):
    """Schema de auditoría con información del usuario."""
    usuario_nombre: Optional[str] = None
    usuario_correo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)