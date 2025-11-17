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


# 🆕 US-06: Cambio de Contraseña
class ChangePasswordSchema(BaseModel):
    """
    Esquema para cambiar la contraseña de un usuario autenticado.
    
    Validaciones:
    - current_password: contraseña actual del usuario
    - new_password: nueva contraseña (debe cumplir política)
    - confirm_new_password: confirmación de nueva contraseña
    """
    current_password: str
    new_password: str
    confirm_new_password: str

# =========================
# US-07: Recuperación de Contraseña (RF10)
# =========================

class ForgotPasswordRequest(BaseModel):
    """
    Esquema para solicitar recuperación de contraseña.
    
    Solo requiere el correo del usuario.
    """
    correo: EmailStr


class ResetPasswordRequest(BaseModel):
    """
    Esquema para restablecer contraseña con token.
    
    Validaciones:
    - token: código recibido por correo
    - new_password: nueva contraseña (debe cumplir política)
    - confirm_new_password: confirmación de nueva contraseña
    """
    token: str
    new_password: str
    confirm_new_password: str