# backend/app/schemas/auth.py

from typing import Optional

from pydantic import BaseModel, EmailStr


class LoginSchema(BaseModel):
    """Esquema para login (US-02)."""
    correo: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
