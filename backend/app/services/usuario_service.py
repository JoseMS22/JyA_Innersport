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
from app.schemas.auth import ChangePasswordSchema
from app.core.password_policy import validate_password_policy
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.core.email import send_password_reset_email

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

# =========================
# US-07 / RF10: Recuperación de Contraseña
# =========================

def request_password_reset(db: Session, data: ForgotPasswordRequest) -> dict:
    """
    Solicita recuperación de contraseña.
    
    Criterios de aceptación (CA1):
    - Envía enlace seguro con token de un solo uso
    - Token expira en 30 minutos
    - SIEMPRE muestra mensaje genérico (no revela si el correo existe)
    
    Criterios de aceptación (CA2):
    - Aplica rate limiting: máximo 3 intentos por hora
    - Bloquea temporalmente si se excede
    - Registra eventos en auditoría
    """
    
    # 1️⃣ Buscar usuario por correo (sin revelar si existe)
    usuario = (
        db.query(Usuario)
        .filter(Usuario.correo == data.correo)
        .first()
    )
    
    # 2️⃣ SIEMPRE devolver mensaje genérico (CA1)
    mensaje_generico = {
        "message": "Si el correo está registrado, recibirás un enlace de recuperación. Revisa tu bandeja de entrada y spam."
    }
    
    # Si el usuario no existe, solo devolvemos mensaje genérico
    if not usuario:
        # 📝 Log de auditoría
        print(f"[AUDIT] Intento de reset para correo no registrado: {data.correo}")
        return mensaje_generico
    
    # 3️⃣ Rate Limiting (CA2): verificar intentos
    ahora = datetime.now(timezone.utc)
    
    # Si hay un intento previo, verificar si han pasado menos de 1 hora
    if usuario.ultimo_intento_reset:
        tiempo_transcurrido = ahora - usuario.ultimo_intento_reset
        
        # Si han pasado más de 1 hora, resetear contador
        if tiempo_transcurrido > timedelta(hours=1):
            usuario.reset_password_attempts = 0
        
        # Si aún no ha pasado 1 hora y ya llegó a 3 intentos, bloquear
        elif usuario.reset_password_attempts >= 3:
            # 📝 Log de auditoría
            print(f"[AUDIT] Usuario {usuario.id} bloqueado por exceso de intentos de reset")
            
            # Calcular tiempo restante de bloqueo
            tiempo_restante = timedelta(hours=1) - tiempo_transcurrido
            minutos_restantes = int(tiempo_restante.total_seconds() / 60)
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos. Por favor intenta de nuevo en {minutos_restantes} minutos.",
            )
    
    # 4️⃣ Generar token seguro
    reset_token = secrets.token_urlsafe(32)
    token_expira = ahora + timedelta(minutes=30)  # Expira en 30 minutos
    
    # 5️⃣ Actualizar usuario
    usuario.reset_password_token = reset_token
    usuario.reset_password_token_expira = token_expira
    usuario.reset_password_attempts = (usuario.reset_password_attempts or 0) + 1
    usuario.ultimo_intento_reset = ahora
    
    db.commit()
    
    # 6️⃣ Enviar correo (sin lanzar excepción si falla)
    try:
        send_password_reset_email(usuario.correo, reset_token)
    except Exception as e:
        print(f"[ERROR] No se pudo enviar correo de recuperación a {usuario.correo}: {e}")
        # NO fallar la operación si el correo no se envía
    
    # 📝 Log de auditoría
    print(f"[AUDIT] Usuario {usuario.id} ({usuario.correo}) solicitó reset de contraseña")
    
    # ⭐️ IMPRIMIR TOKEN PARA PRUEBAS
    print("\n==========================================")
    print(" TOKEN DE RECUPERACIÓN GENERADO")
    print(f" Usuario: {usuario.correo}")
    print(f" Token: {reset_token}")
    print(f" Expira: {token_expira}")
    print("==========================================\n")
    
    return mensaje_generico


def reset_password_with_token(db: Session, data: ResetPasswordRequest) -> dict:
    """
    Restablece contraseña usando token de recuperación.
    
    Criterios de aceptación (CA3):
    - Valida token (vigencia, no usado, asociado al usuario)
    - Requiere nueva contraseña que cumpla política
    - Exige confirmación de contraseña
    - Rechaza si token expirado/inválido/usado
    
    Criterios de aceptación (CA4):
    - Invalida todas las sesiones activas (logout global)
    - Registra acción en auditoría
    """
    
    # 1️⃣ Validar que las contraseñas coincidan
    if data.new_password != data.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=["La nueva contraseña y su confirmación no coinciden."],
        )
    
    # 2️⃣ Validar política de contraseña
    validate_password_policy(data.new_password)
    
    # 3️⃣ Buscar usuario por token
    usuario = (
        db.query(Usuario)
        .filter(Usuario.reset_password_token == data.token)
        .first()
    )
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de recuperación inválido o expirado.",
        )
    
    # 4️⃣ Validar que el token no haya expirado
    ahora = datetime.now(timezone.utc)
    if not usuario.reset_password_token_expira or usuario.reset_password_token_expira < ahora:
        # Limpiar token expirado
        usuario.reset_password_token = None
        usuario.reset_password_token_expira = None
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación ha expirado. Por favor solicita uno nuevo.",
        )
    
    # 5️⃣ Hashear nueva contraseña
    nuevo_hash = get_password_hash(data.new_password)
    
    # 6️⃣ Actualizar contraseña y limpiar token
    usuario.contrasena_hash = nuevo_hash
    usuario.reset_password_token = None
    usuario.reset_password_token_expira = None
    usuario.reset_password_attempts = 0  # Resetear contador
    usuario.ultimo_intento_reset = None
    
    db.commit()
    db.refresh(usuario)
    
    # 7️⃣ Logout global (CA4)
    # Nota: Con JWT en cookies HttpOnly, el logout real se hace en el frontend
    # borrando la cookie. Aquí registramos la acción.
    
    # 📝 Log de auditoría (CA4)
    print(f"[AUDIT] Usuario {usuario.id} ({usuario.correo}) restableció su contraseña mediante token")
    print(f"[AUDIT] Todas las sesiones del usuario {usuario.id} deben ser invalidadas")
    
    return {
        "message": "Contraseña restablecida correctamente. Por favor inicia sesión con tu nueva contraseña.",
        "usuario": usuario.correo,
    }