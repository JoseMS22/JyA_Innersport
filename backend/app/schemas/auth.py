# backend/app/schemas/auth.py

from typing import Optional
from pydantic import BaseModel, Field

from pydantic import BaseModel, EmailStr


class LoginSchema(BaseModel):
    """Esquema para login (US-02)."""
    correo: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class DeleteAccountSchema(BaseModel):
    password: str = Field(..., description="Contraseña actual para reautenticar")
    confirm: bool = Field(
        ...,
        description="Debe ser true para confirmar la eliminación de la cuenta",
    )

class DeleteAccountResponse(BaseModel):
    detail: str
    deletion_scheduled_for: str | None = None  # o datetime si prefieres


class TokenData(BaseModel):
    """
    Datos que extraemos del JWT.
    sub = id de usuario
    rol = rol del usuario
    """
    sub: Optional[str] = None
    rol: Optional[str] = None

class VerifyEmailSchema(BaseModel):
    token: str
