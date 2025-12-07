# backend/app/schemas/usuario.py

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict, Field


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

class UserUpdate(BaseModel):
    """
    Datos que el usuario puede actualizar de su perfil.
    NO incluye correo, rol, ni contraseña.
    """
    nombre: Optional[str] = Field(None, max_length=120)
    telefono: Optional[str] = Field(None, max_length=20)

    # Campos de la dirección principal
    provincia: Optional[str] = Field(None, max_length=100)
    canton: Optional[str] = Field(None, max_length=100)
    distrito: Optional[str] = Field(None, max_length=100)
    detalle: Optional[str] = None
    telefono_direccion: Optional[str] = Field(None, max_length=20)


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


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., description="Contraseña actual para reautenticación")
    confirm: bool = Field(
        ...,
        description="Debe ser true indicando que el usuario acepta la eliminación y la pérdida de datos",
    )


class DeleteAccountResponse(BaseModel):
    detail: str
    deletion_scheduled_for: datetime | None = None

class UsuarioMini(BaseModel):
    id: int
    nombre: str
    rol: str

    class Config:
        from_attributes = True

class UsuarioRead(BaseModel):
    id: int
    nombre: str
    correo: str
    rol: str
    activo: bool
    telefono: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

#=========================
# ADMIN - GESTIÓN DE USUARIOS
#=========================
class UserCreateAdmin(BaseModel):
    """
    Creación de usuario por parte de un administrador.
    - Permite definir el rol explícitamente.
    - No requiere dirección obligatoria al inicio (útil para vendedores/admins).
    """
    nombre: str
    correo: EmailStr
    password: str
    confirm_password: str
    rol: str = "CLIENTE"  # CLIENTE, VENDEDOR, ADMIN
    activo: bool = True
    telefono: Optional[str] = None

class UserUpdateAdmin(BaseModel):
    """
    Edición completa de usuario por parte de un administrador.
    Permite cambiar roles, estado activo/inactivo, contraseñas, etc.
    """
    nombre: Optional[str] = None
    correo: Optional[EmailStr] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None # Opcional: para resetear contraseña manualmente

class UserListResponse(BaseModel):
    total: int
    items: List[UserPublic]
