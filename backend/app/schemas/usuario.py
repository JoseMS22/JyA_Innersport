# backend/app/schemas/usuario.py

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


# =========================
# DIRECCIÓN
# =========================

class DireccionBase(BaseModel):
    provincia: str
    canton: str
    distrito: str
    detalle: str
    telefono: Optional[str] = None


class DireccionCreate(DireccionBase):
    """Datos necesarios para crear una dirección."""
    pass


class DireccionPublic(DireccionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================
# USUARIO
# =========================

class UserBase(BaseModel):
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None
    rol: str = "CLIENTE"
    activo: bool = True


class UserCreate(BaseModel):
    """
    Esquema para registro de usuario (US-01).
    Incluye la contraseña en texto plano y la dirección.
    """
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None

    password: str
    confirm_password: str

    # Datos de dirección al registrarse
    provincia: str
    canton: str
    distrito: str
    detalle: str
    telefono_direccion: Optional[str] = None


class UserPublic(UserBase):
    """
    Esquema que devolvemos al frontend.
    Nunca incluye la contraseña.
    """
    id: int
    created_at: datetime
    updated_at: datetime
    email_verificado: bool  # 🔹 NUEVO
    direccion: Optional[DireccionPublic] = None

    model_config = ConfigDict(from_attributes=True)


class UserInDB(UserBase):
    """
    Representación interna (si la necesitas en servicios).
    Incluye el hash de contraseña.
    """
    id: int
    contrasena_hash: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
