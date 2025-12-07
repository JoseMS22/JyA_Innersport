# backend/app/services/usuario_service.py

from sqlalchemy import or_  # 🔧 CORREGIDO: Usar sqlalchemy, no operator
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.usuario import Usuario
from app.models.direccion import Direccion
from app.schemas.usuario import UserCreate, UserPublic, UserUpdate, UserCreateAdmin, UserUpdateAdmin
from app.schemas.auth import DeleteAccountSchema, LoginSchema
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
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.core.email import send_password_reset_email
from app.schemas.pos import POSClienteCreate # Import necesario para el código de tu compañero

# Configuration constants
GRACE_DAYS = 180  # Period before permanent account deletion


# =========================
# US-01: Registro de usuario
# =========================

def create_user(db: Session, user_in: UserCreate) -> Usuario:
    """
    Crea un usuario nuevo con su dirección asociada.
    """
    # 1) Contraseña y confirmación deben coincidir
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["Las contraseñas no coinciden."],
        )

    # 2) Política de contraseña
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
    expira = datetime.now(timezone.utc) + timedelta(hours=24)

    # ⭐️ DEBUG
    print("\n==========================================")
    print(" TOKEN DE VERIFICACIÓN GENERADO")
    print(" →", token)
    print("==========================================\n")

    # 5) Crear usuario
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
    db.flush()

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

    # 7) Guardar
    db.commit()
    db.refresh(usuario)

    # Enviar correo
    send_verification_email(usuario.correo, token)

    return usuario


# =========================
# US-02: Autenticación (login)
# =========================

def authenticate_user(db: Session, correo: str, password: str) -> Usuario | None:
    usuario = db.query(Usuario).filter(Usuario.correo == correo).first()

    if not usuario: return None
    if not usuario.activo: return None
    if not usuario.email_verificado: return None
    if not verify_password(password, usuario.contrasena_hash): return None

    return usuario


def login_user(db: Session, login_in: LoginSchema) -> str:
    usuario = db.query(Usuario).filter(Usuario.correo == login_in.correo).first()

    if not usuario or not verify_password(login_in.password, usuario.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
        )

    # Cuenta en proceso de eliminación
    if usuario.pendiente_eliminacion:
        now_utc = datetime.now(timezone.utc)
        if usuario.eliminacion_programada_at and usuario.eliminacion_programada_at <= now_utc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El periodo de gracia ha expirado. La cuenta no puede reactivarse.",
            )

        deletion_iso = (
            usuario.eliminacion_programada_at.isoformat()
            if usuario.eliminacion_programada_at
            else ""
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"CUENTA_PENDIENTE_ELIMINACION;{deletion_iso}",
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
    usuario = db.query(Usuario).filter(Usuario.token_verificacion == token).first()

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
# Gestión de Cuenta (Eliminar / Reactivar / Perfil)
# =========================

def delete_user(db: Session, user_id: int) -> Usuario | None:
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not usuario:
        return None

    direccion = db.query(Direccion).filter(Direccion.usuario_id == user_id).first()
    if direccion:
        db.delete(direccion)

    db.delete(usuario)
    db.commit()
    return usuario

def validate_delete_account_rules(db: Session, usuario: Usuario) -> None:
    return

def request_account_deletion(db: Session, usuario: Usuario, delete_in: DeleteAccountSchema) -> Usuario:
    if not delete_in.confirm:
        raise HTTPException(status_code=400, detail="Debes confirmar la eliminación.")

    if not verify_password(delete_in.password, usuario.contrasena_hash):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")
    
    validate_delete_account_rules(db, usuario)

    if usuario.pendiente_eliminacion:
        raise HTTPException(status_code=400, detail="Ya tienes una solicitud en proceso.")
    
    now = datetime.now(timezone.utc)
    grace_until = now + timedelta(days=GRACE_DAYS)

    usuario.activo = False
    usuario.pendiente_eliminacion = True
    usuario.eliminacion_solicitada_at = now
    usuario.eliminacion_programada_at = grace_until

    db.commit()
    db.refresh(usuario)
    return usuario

def reactivate_account(db: Session, data: LoginSchema) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.correo == data.correo).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if not usuario.pendiente_eliminacion:
        raise HTTPException(status_code=400, detail="La cuenta no está en proceso de eliminación.")

    if not verify_password(data.password, usuario.contrasena_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    now_utc = datetime.now(timezone.utc)
    if usuario.eliminacion_programada_at and usuario.eliminacion_programada_at <= now_utc:
        raise HTTPException(status_code=400, detail="El periodo de gracia ha expirado.")

    usuario.activo = True
    usuario.pendiente_eliminacion = False
    usuario.eliminacion_solicitada_at = None
    usuario.eliminacion_programada_at = None

    db.commit()
    db.refresh(usuario)
    return usuario

def update_profile(db: Session, usuario: Usuario, data: UserUpdate) -> Usuario:
    if data.nombre is not None and not data.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre no puede estar vacío.")

    if data.nombre is not None:
        usuario.nombre = data.nombre.strip()

    if data.telefono is not None:
        usuario.telefono = data.telefono.strip()

    direccion = db.query(Direccion).filter(Direccion.usuario_id == usuario.id).first()
    
    hay_datos_direccion = any([
        data.provincia is not None, data.canton is not None,
        data.distrito is not None, data.detalle is not None,
        data.telefono_direccion is not None,
    ])

    if hay_datos_direccion:
        if not direccion:
            direccion = Direccion(
                usuario_id=usuario.id,
                provincia=data.provincia or "",
                canton=data.canton or "",
                distrito=data.distrito or "",
                detalle=data.detalle or "",
                telefono=data.telefono_direccion or None,
            )
            db.add(direccion)
        else:
            if data.provincia is not None: direccion.provincia = data.provincia.strip()
            if data.canton is not None: direccion.canton = data.canton.strip()
            if data.distrito is not None: direccion.distrito = data.distrito.strip()
            if data.detalle is not None: direccion.detalle = data.detalle
            if data.telefono_direccion is not None: direccion.telefono = data.telefono_direccion.strip()

    db.commit()
    db.refresh(usuario)
    return usuario


# =========================
# Contraseñas (Cambio / Recuperación)
# =========================

def change_password(db: Session, usuario: Usuario, data: ChangePasswordSchema) -> Usuario:
    if not verify_password(data.current_password, usuario.contrasena_hash):
        raise HTTPException(status_code=400, detail=["La contraseña actual es incorrecta."])
    
    if data.new_password != data.confirm_new_password:
        raise HTTPException(status_code=400, detail=["Las contraseñas no coinciden."])
    
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail=["La nueva contraseña debe ser diferente."])
    
    validate_password_policy(data.new_password)
    
    usuario.contrasena_hash = get_password_hash(data.new_password)
    db.commit()
    db.refresh(usuario)
    return usuario

def request_password_reset(db: Session, data: ForgotPasswordRequest) -> dict:
    usuario = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    
    mensaje_generico = {"message": "Si el correo está registrado, recibirás un enlace de recuperación."}
    
    if not usuario:
        return mensaje_generico
    
    ahora = datetime.now(timezone.utc)
    if usuario.ultimo_intento_reset:
        tiempo = ahora - usuario.ultimo_intento_reset
        if tiempo > timedelta(hours=1):
            usuario.reset_password_attempts = 0
        elif usuario.reset_password_attempts >= 3:
            raise HTTPException(status_code=429, detail="Demasiados intentos.")
    
    reset_token = secrets.token_urlsafe(32)
    token_expira = ahora + timedelta(minutes=30)
    
    usuario.reset_password_token = reset_token
    usuario.reset_password_token_expira = token_expira
    usuario.reset_password_attempts = (usuario.reset_password_attempts or 0) + 1
    usuario.ultimo_intento_reset = ahora
    
    db.commit()
    
    try:
        send_password_reset_email(usuario.correo, reset_token)
    except Exception as e:
        print(f"Error correo: {e}")
    
    return mensaje_generico

def reset_password_with_token(db: Session, data: ResetPasswordRequest) -> dict:
    if data.new_password != data.confirm_new_password:
        raise HTTPException(status_code=400, detail=["Las contraseñas no coinciden."])
    
    validate_password_policy(data.new_password)
    
    usuario = db.query(Usuario).filter(Usuario.reset_password_token == data.token).first()
    
    if not usuario:
        raise HTTPException(status_code=400, detail="Token inválido.")
    
    ahora = datetime.now(timezone.utc)
    if not usuario.reset_password_token_expira or usuario.reset_password_token_expira < ahora:
        usuario.reset_password_token = None
        usuario.reset_password_token_expira = None
        db.commit()
        raise HTTPException(status_code=400, detail="Token expirado.")
    
    usuario.contrasena_hash = get_password_hash(data.new_password)
    usuario.reset_password_token = None
    usuario.reset_password_token_expira = None
    usuario.reset_password_attempts = 0
    usuario.ultimo_intento_reset = None
    
    db.commit()
    db.refresh(usuario)
    
    return {"message": "Contraseña restablecida correctamente."}


# ==========================================
# 🆕 GESTIÓN ADMIN (Tus Cambios)
# ==========================================

def get_users_admin(
    db: Session, 
    skip: int = 0, 
    limit: int = 10, 
    rol: str = None, 
    search: str = None
):
    query = db.query(Usuario)

    if rol:
        query = query.filter(Usuario.rol == rol)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Usuario.nombre.ilike(search_term),
                Usuario.correo.ilike(search_term)
            )
        )

    total = query.count()
    users = query.order_by(Usuario.created_at.desc()).offset(skip).limit(limit).all()

    return {"total": total, "items": users}

def get_user_by_id(db: Session, user_id: int) -> Usuario:
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return user

def create_user_admin(db: Session, user_in: UserCreateAdmin) -> Usuario:
    if user_in.password != user_in.confirm_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    if db.query(Usuario).filter(Usuario.correo == user_in.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    validate_password_policy(user_in.password)

    hashed_pw = get_password_hash(user_in.password)
    
    db_user = Usuario(
        nombre=user_in.nombre,
        correo=user_in.correo,
        contrasena_hash=hashed_pw,
        rol=user_in.rol,
        activo=user_in.activo,
        telefono=user_in.telefono,
        email_verificado=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_admin(db: Session, user_id: int, user_in: UserUpdateAdmin) -> Usuario:
    user = get_user_by_id(db, user_id)

    if user_in.correo and user_in.correo != user.correo:
        if db.query(Usuario).filter(Usuario.correo == user_in.correo).first():
            raise HTTPException(status_code=400, detail="El correo ya está en uso")
        user.correo = user_in.correo

    if user_in.nombre:
        user.nombre = user_in.nombre
    if user_in.telefono:
        user.telefono = user_in.telefono
    if user_in.rol:
        user.rol = user_in.rol
    if user_in.activo is not None:
        user.activo = user_in.activo
    
    if user_in.password:
        validate_password_policy(user_in.password)
        user.contrasena_hash = get_password_hash(user_in.password)

    user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(user)
    return user


# ==========================================
# 🆕 GESTIÓN POS (Cambios de tu compañero)
# ==========================================

def create_cliente_pos(db: Session, data: POSClienteCreate) -> Usuario:
    """
    Crea un usuario CLIENTE desde POS.
    - Sin dirección
    - Aplica política de contraseña
    - Verifica correo único
    - Genera token de verificación y envía correo
    """

    if data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["Las contraseñas no coinciden."],
        )

    validate_password_policy(data.password)

    existing = (
        db.query(Usuario)
        .filter(Usuario.correo == data.correo)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["El correo ya está registrado."],
        )

    hashed_password = get_password_hash(data.password)

    token = secrets.token_urlsafe(32)
    expira = datetime.now(timezone.utc) + timedelta(hours=24)

    print("\n==========================================")
    print(" TOKEN DE VERIFICACIÓN (POS) GENERADO")
    print(" →", token)
    print("==========================================\n")

    usuario = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        telefono=data.telefono,
        contrasena_hash=hashed_password,
        rol="CLIENTE",
        activo=True,
        email_verificado=False,
        token_verificacion=token,
        token_verificacion_expira=expira,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    send_verification_email(usuario.correo, token)

    return usuario