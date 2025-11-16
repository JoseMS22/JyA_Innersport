# backend/app/services/usuario_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.usuario import Usuario
from app.models.direccion import Direccion
from app.schemas.usuario import UserCreate, UserPublic, UserUpdate
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

# Configuration constants
GRACE_DAYS = 180  # Period before permanent account deletion



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
# US-04: Eliminar usuario/cuenta
# =========================

def delete_user(db: Session, user_id: int) -> Usuario | None:
    """
    Elimina un usuario y su dirección asociada.
    Devuelve el usuario eliminado o None si no existe.
    """

    usuario = (
        db.query(Usuario)
        .filter(Usuario.id == user_id)
        .first()
    )

    if not usuario:
        return None

    # Borrar dirección si existe
    direccion = (
        db.query(Direccion)
        .filter(Direccion.usuario_id == user_id)
        .first()
    )

    if direccion:
        db.delete(direccion)

    db.delete(usuario)
    db.commit()

    return usuario

def validate_delete_account_rules(db: Session, usuario: Usuario) -> None:
    """
    Aquí irían las reglas de bloqueo:
    - pedidos abiertos
    - obligaciones legales
    - saldos pendientes
    De momento lo dejamos como stub que siempre permite.
    """
    # TODO: implementar reglas reales según RFs de negocio
    return


def request_account_deletion(
    db: Session,
    usuario: Usuario,
    delete_in: DeleteAccountSchema,
) -> Usuario:
    """
    Solicita la eliminación de la cuenta del usuario autenticado.
    Cumple criterios:
    - Reautenticación con contraseña
    - Confirmación explícita
    - Soft delete + periodo de gracia
    - Revocación de accesos (activo = False, pendiente_eliminacion = True)
    """

    # 1) Confirmación explícita
    if not delete_in.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes confirmar la eliminación marcando la casilla correspondiente.",
        )

    # 2) Reautenticación con contraseña actual
    if not verify_password(delete_in.password, usuario.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta. No se pudo confirmar la eliminación.",
        )
    
    # 3) Validar reglas de negocio (bloqueos)
    validate_delete_account_rules(db, usuario)

    # 4) Marcar cuenta como desactivada + pendiente de eliminación
    # Antes de marcar, por si ya está pendiente
    if usuario.pendiente_eliminacion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes una solicitud de eliminación de cuenta en proceso.",
        )
    now = datetime.now(timezone.utc)
    grace_until = now + timedelta(days=GRACE_DAYS)

    usuario.activo = False
    usuario.pendiente_eliminacion = True
    usuario.eliminacion_solicitada_at = now
    usuario.eliminacion_programada_at = grace_until

    db.commit()
    db.refresh(usuario)
    
    return usuario


def update_profile(
    db: Session,
    usuario: Usuario,
    data: UserUpdate,
) -> Usuario:
    """
    US-03: Actualiza datos no sensibles del perfil del usuario:
    - nombre, telefono
    - dirección principal (provincia, canton, distrito, detalle, telefono_direccion)
    No permite cambiar correo, rol ni contraseña.
    """

    # Validaciones simples de coherencia (puedes hacerlas más estrictas si quieres)
    if data.nombre is not None and not data.nombre.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre no puede estar vacío.",
        )

    # 1) Actualizar campos básicos del usuario
    if data.nombre is not None:
        usuario.nombre = data.nombre.strip()

    if data.telefono is not None:
        # Opcional: podrías validar largo/formato
        if len(data.telefono) > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El teléfono no puede tener más de 20 caracteres.",
            )
        usuario.telefono = data.telefono.strip()

    # 2) Actualizar / crear dirección asociada
    direccion = (
        db.query(Direccion)
        .filter(Direccion.usuario_id == usuario.id)
        .first()
    )

    # ¿Hay campos de dirección en el payload?
    hay_datos_direccion = any(
        [
            data.provincia is not None,
            data.canton is not None,
            data.distrito is not None,
            data.detalle is not None,
            data.telefono_direccion is not None,
        ]
    )

    if hay_datos_direccion:
        # Si no existe dirección, la creamos
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
            # Si existe, actualizamos solo lo que venga en el payload
            if data.provincia is not None:
                direccion.provincia = data.provincia.strip()
            if data.canton is not None:
                direccion.canton = data.canton.strip()
            if data.distrito is not None:
                direccion.distrito = data.distrito.strip()
            if data.detalle is not None:
                direccion.detalle = data.detalle
            if data.telefono_direccion is not None:
                if len(data.telefono_direccion) > 20:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El teléfono de entrega no puede tener más de 20 caracteres.",
                    )
                direccion.telefono = data.telefono_direccion.strip()

    db.commit()
    db.refresh(usuario)
    return usuario
