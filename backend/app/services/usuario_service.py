# backend/app/services/usuario_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.usuario import Usuario
from app.models.direccion import Direccion
from app.schemas.usuario import UserCreate, UserPublic
from app.schemas.auth import LoginSchema
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)
from app.core.password_policy import validate_password_policy

from datetime import datetime, timedelta, timezone
import secrets
from app.core.email import send_verification_email
from app.schemas.auth import ChangePasswordSchema
from app.core.password_policy import validate_password_policy



# =========================
# US-01: Registro de usuario
# =========================

def create_user(db: Session, user_in: UserCreate) -> Usuario:
    """
    Crea un usuario nuevo con su dirección asociada.
    Aplica:
    - validación de contraseñas (coincidencia + política)
    - validación de correo único
    - generación de token de verificación de correo
    """

    # 1) Contraseña y confirmación deben coincidir
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["Las contraseñas no coinciden."],
        )

    # 2) Política de contraseña (US-05)
    validate_password_policy(user_in.password)

    # 3) Verificar si el correo ya existe
    existing = (
        db.query(Usuario)
        .filter(Usuario.correo == user_in.correo)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["El correo ya está registrado."],
        )

    # 4) Hashear contraseña
    hashed_password = get_password_hash(user_in.password)

    # 🔹 Generar token de verificación
    token = secrets.token_urlsafe(32)
    expira = datetime.now(timezone.utc) + timedelta(hours=24)  # válido por 24 horas


     # ⭐️ AQUI IMPRIMIMOS EL TOKEN PARA PROBAR EN /docs
    print("\n==========================================")
    print(" TOKEN DE VERIFICACIÓN GENERADO")
    print(" →", token)
    print("==========================================\n")

    # 5) Crear usuario (rol CLIENTE por defecto)
    usuario = Usuario(
        nombre=user_in.nombre,
        correo=user_in.correo,
        telefono=user_in.telefono,
        contrasena_hash=hashed_password,
        rol="CLIENTE",
        activo=True,
        email_verificado=False,
        token_verificacion=token,
        token_verificacion_expira=expira,
    )
    db.add(usuario)
    db.flush()  # Para obtener usuario.id antes de crear la dirección

    # 6) Crear dirección asociada
    direccion = Direccion(
        usuario_id=usuario.id,
        provincia=user_in.provincia,
        canton=user_in.canton,
        distrito=user_in.distrito,
        detalle=user_in.detalle,
        telefono=user_in.telefono_direccion,
    )
    db.add(direccion)

    # 7) Guardar en BD
    db.commit()
    db.refresh(usuario)

    # Enviar correo de verificación
    send_verification_email(usuario.correo, token)

    return usuario


# =========================
# US-02: Autenticación (login)
# =========================

def authenticate_user(db: Session, correo: str, password: str) -> Usuario | None:
    """
    Verifica que el usuario exista, esté activo y que la contraseña sea correcta.
    Devuelve el usuario si todo es correcto, o None si falla.
    """
    usuario = (
        db.query(Usuario)
        .filter(Usuario.correo == correo)
        .first()
    )

    if not usuario:
        return None

    if not usuario.activo:
        return None

    # 🔹 Bloquear si el correo no está verificado
    if not usuario.email_verificado:
        return None

    if not verify_password(password, usuario.contrasena_hash):
        return None

    return usuario


def login_user(db: Session, login_in: LoginSchema) -> str:
    usuario = (
        db.query(Usuario)
        .filter(Usuario.correo == login_in.correo)
        .first()
    )

    if not usuario or not verify_password(login_in.password, usuario.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo o bloqueado.",
        )

    if not usuario.email_verificado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes verificar tu correo antes de iniciar sesión.",
        )

    token_data = {
        "sub": str(usuario.id),
        "rol": usuario.rol,
    }

    access_token = create_access_token(token_data)
    return access_token

def verify_email(db: Session, token: str) -> Usuario:
    """
    Verifica el correo de un usuario dado un token de verificación.
    - Busca usuario por token
    - Valida expiración
    - Marca email_verificado = True
    - Limpia token y expiración
    """

    usuario = (
        db.query(Usuario)
        .filter(Usuario.token_verificacion == token)
        .first()
    )

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de verificación inválido.",
        )

    now_utc = datetime.now(timezone.utc)
    if not usuario.token_verificacion_expira or usuario.token_verificacion_expira < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de verificación ha expirado.",
        )

    usuario.email_verificado = True
    usuario.token_verificacion = None
    usuario.token_verificacion_expira = None

    db.commit()
    db.refresh(usuario)

    return usuario

# =========================
# US-06: Cambio de Contraseña
# =========================

def change_password(
    db: Session,
    usuario: Usuario,
    data: ChangePasswordSchema,
) -> Usuario:
    """
    Cambia la contraseña de un usuario autenticado.
    
    Validaciones aplicadas:
    1. La contraseña actual debe ser correcta
    2. La nueva contraseña debe cumplir la política de seguridad
    3. La nueva contraseña y su confirmación deben coincidir
    4. La nueva contraseña NO puede ser igual a la actual
    """
    
    # 1️⃣ Validar que la contraseña actual sea correcta
    if not verify_password(data.current_password, usuario.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["La contraseña actual es incorrecta."],
        )
    
    # 2️⃣ Validar que nueva contraseña y confirmación coincidan
    if data.new_password != data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["La nueva contraseña y su confirmación no coinciden."],
        )
    
    # 3️⃣ Validar que la nueva contraseña NO sea igual a la actual
    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["La nueva contraseña debe ser diferente a la actual."],
        )
    
    # 4️⃣ Validar política de contraseña (RF08)
    validate_password_policy(data.new_password)
    
    # 5️⃣ Hashear nueva contraseña
    nuevo_hash = get_password_hash(data.new_password)
    
    # 6️⃣ Actualizar en base de datos
    usuario.contrasena_hash = nuevo_hash
    
    db.commit()
    db.refresh(usuario)
    
    # 📝 Log de auditoría (RNF12)
    print(f"[AUDIT] Usuario {usuario.id} ({usuario.correo}) cambió su contraseña")
    
    return usuario