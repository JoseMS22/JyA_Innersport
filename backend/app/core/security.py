# backend/app/core/security.py

from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.models.usuario import Usuario

# Contexto de hashing de contraseñas (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


# =========================
# HASH DE CONTRASEÑA
# =========================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# =========================
# JWT
# =========================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Crea un token JWT con expiración.
    data: normalmente incluye "sub" (id de usuario) y "rol".
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return encoded_jwt


# =========================
# USUARIO ACTUAL VIA COOKIE
# =========================

def _decode_token(token: str) -> dict:
    """
    Decodifica el JWT y devuelve el payload (dict).
    Lanza 401 si el token es inválido o expiró.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Usuario:
    """
    Obtiene el usuario actual a partir del token almacenado en la cookie 'access_token'.
    Bloquea:
    - usuarios inactivos
    - usuarios en proceso de eliminación (US-04)
    - tokens inválidos
    """

    # 1) Verificar que existe el token en cookie
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se encontró token de autenticación.",
        )

    # 2) Decodificar token
    payload = _decode_token(token)
    sub = payload.get("sub")

    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin identificador de usuario.",
        )

    # 3) Cargar usuario desde la base de datos
    user = db.query(Usuario).filter(Usuario.id == int(sub)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
        )

    # 4) Bloqueo por inactividad
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está desactivada.",
        )

    # 5) Bloqueo para US-04 (pendiente de eliminación)
    if getattr(user, "pendiente_eliminacion", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Tu cuenta está en proceso de eliminación. "
                "No puedes acceder mientras el proceso esté activo."
            ),
        )

    return user


def get_current_active_user(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """
    Wrapper por si luego quieres añadir más reglas
    (por ejemplo verificación de correo, etc.).
    """
    return current_user


# =========================
# HELPERS DE PERMISOS (ROLES)
# =========================

def get_current_admin_user(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """
    Devuelve el usuario actual solo si tiene rol ADMIN.
    """
    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción (se requiere rol ADMIN).",
        )
    return current_user


def get_current_staff_user(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """
    Devuelve el usuario actual si es ADMIN o VENDEDOR.
    Útil para inventario, POS, etc.
    """
    if current_user.rol not in ("ADMIN", "VENDEDOR"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción (se requiere ADMIN o VENDEDOR).",
        )
    return current_user
