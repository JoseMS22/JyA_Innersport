# backend/app/api/v1/auth.py

from fastapi import APIRouter, Depends, status, Response, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.usuario import UserCreate, UserPublic, UserUpdate
from app.schemas.auth import (
    LoginSchema,
    Token,
    VerifyEmailSchema,
    DeleteAccountSchema,
    DeleteAccountResponse,
)
from app.services.usuario_service import (
    GRACE_DAYS,
    create_user,
    login_user,
    verify_email,
    request_account_deletion,
    delete_user,
    update_profile,
)
from app.core.security import get_current_user
from app.core.config import settings
from app.models.usuario import Usuario
from app.schemas.auth import (
    LoginSchema, 
    Token, 
    VerifyEmailSchema,
    ChangePasswordSchema,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.usuario_service import (
    create_user, 
    login_user, 
    verify_email,
    change_password,
    request_password_reset,
    reset_password_with_token,
)

router = APIRouter()


# =========================
# US-01: Registro
# =========================

@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Crea un nuevo usuario CLIENTE con su dirección.
    Aplica:
    - validación de contraseña (US-05)
    - correo único
    - hashing de contraseña
    - genera token de verificación y envía correo
    """
    usuario = create_user(db, user_in)
    return usuario


# =========================
# US-02: Login (HttpOnly cookie)
# =========================

@router.post(
    "/login",
    response_model=Token,
)
def login(
    login_in: LoginSchema,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Autentica al usuario y devuelve un access_token JWT.
    Además, guarda el token en una cookie HttpOnly (access_token).
    """
    access_token = login_user(db, login_in)

    # Cookie de sesión
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # segundos
        samesite="lax",
        secure=False,  # En producción pon esto en True (HTTPS)
        path="/",
    )

    # Devolvemos también el token en el body por compatibilidad / debug
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =========================
# Logout
# =========================

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
def logout(
    response: Response,
    current_user: Usuario = Depends(get_current_user),
):
    """
    Elimina la cookie de sesión (access_token).
    """
    response.delete_cookie(
        "access_token",
        httponly=True,
        samesite="lax",
        secure=False,  # En producción True
        path="/",
    )
    return {"message": "Sesión cerrada correctamente."}


# =========================
# Verificación de correo
# =========================

@router.post(
    "/verify-email",
    status_code=status.HTTP_200_OK,
)
def verify_email_endpoint(
    payload: VerifyEmailSchema,
    db: Session = Depends(get_db),
):
    """
    Verifica el correo de un usuario a partir del token de verificación.

    En producción, este token se recibiría desde un enlace enviado por correo:
    /verify-email?token=...
    """
    usuario = verify_email(db, payload.token)
    return {
        "message": "Correo verificado correctamente. Ya puedes iniciar sesión.",
        "correo": usuario.correo,
    }


# =========================
# Info de usuario autenticado
# =========================

@router.get("/me", response_model=UserPublic)
def read_me(current_user: Usuario = Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado:
    - id, nombre, correo, telefono
    - direccion asociada (según defina UserPublic)
    No expone contraseña ni campos sensibles.
    """
    return current_user

    # =========================
    # US-03: Actualizar perfil del usuario autenticado.
    # - Solo datos no sensibles (nombre, teléfono, dirección).
    # - Valida formato básico y devuelve el perfil actualizado.
    # =========================

@router.put("/me", response_model=UserPublic)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    
    usuario_actualizado = update_profile(db, current_user, payload)
    return usuario_actualizado


# =========================
# Eliminación directa por ID (uso administrativo)
# =========================

@router.delete(
    "/{user_id}",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
)
def delete_usuario(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Elimina un usuario por ID y devuelve sus datos.
    Pensado para uso administrativo, no forma parte del flujo US-04 (el usuario
    normal se elimina a sí mismo vía /delete-account).
    """
    usuario = delete_user(db, user_id)

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )

    return usuario


# =========================
# Eliminación de cuenta propia (US-04)
# =========================

@router.post(
    "/delete-account",
    response_model=DeleteAccountResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def delete_my_account(
    payload: DeleteAccountSchema,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    US-04: Como usuario quiero eliminar mi cuenta.

    • Requiere usuario autenticado (cookie JWT).
    • Requiere contraseña actual (reautenticación).
    • Requiere confirmación explícita (checkbox).
    • Desactiva la cuenta y la marca como pendiente de eliminación
      (soft delete + periodo de gracia).
    • Revoca la sesión actual eliminando la cookie.
    """

    usuario = request_account_deletion(
        db=db,
        usuario=current_user,
        delete_in=payload,
    )

    # 🔐 Revocar acceso en este navegador: borrar cookie de sesión
    response.delete_cookie(
        "access_token",
        httponly=True,
        samesite="lax",
        secure=False,  # En producción True
        path="/",
    )

    return DeleteAccountResponse(
        detail=(
            "Tu cuenta ha sido desactivada y se ha iniciado el proceso de eliminación. "
            f"Será eliminada de forma irreversible después de {GRACE_DAYS} días, "
            "salvo restricciones legales o de negocio."
        ),
        deletion_scheduled_for=(
            usuario.eliminacion_programada_at.isoformat()
            if usuario.eliminacion_programada_at
            else None
        ),
    )
# =========================
# US-06: Cambio de Contraseña
# =========================

@router.put(
    "/change-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def change_password_endpoint(
    data: ChangePasswordSchema,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite a un usuario autenticado cambiar su contraseña.
    
    **Validaciones aplicadas:**
    - Contraseña actual correcta
    - Nueva contraseña cumple política de seguridad
    - Nueva contraseña y confirmación coinciden
    - Nueva contraseña diferente a la actual
    
    **Requiere autenticación:** ✅ (JWT en cookie HttpOnly)
    """
    
    change_password(db, current_user, data)
    
    return {
        "message": "Contraseña actualizada correctamente.",
        "usuario": current_user.correo,
    }
# =========================
# US-07 / RF10: Recuperación de Contraseña
# =========================

@router.post(
    "/forgot-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Solicita recuperación de contraseña.
    
    **Flujo:**
    1. Usuario ingresa su correo
    2. Si el correo existe, se envía un enlace con token
    3. SIEMPRE se muestra mensaje genérico (no revela si el correo existe)
    
    **Seguridad:**
    - Rate limiting: máximo 3 intentos por hora
    - Token expira en 30 minutos
    - Cada token es de un solo uso
    
    **Criterios de aceptación RF10:**
    - ✅ Mensaje genérico siempre (CA1)
    - ✅ Rate limiting por usuario/IP (CA2)
    - ✅ Token seguro con expiración (CA1)
    - ✅ Auditoría sin exponer datos sensibles (CA2)
    """
    return request_password_reset(db, data)


@router.post(
    "/reset-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def reset_password(
    data: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Restablece contraseña con token de recuperación.
    
    **Flujo:**
    1. Usuario recibe token por correo
    2. Ingresa token + nueva contraseña + confirmación
    3. Sistema valida token y política de contraseña
    4. Actualiza contraseña e invalida token
    5. Invalida todas las sesiones activas (logout global)
    
    **Validaciones:**
    - Token válido y no expirado
    - Nueva contraseña cumple política
    - Contraseña y confirmación coinciden
    
    **Criterios de aceptación RF10:**
    - ✅ Validación completa de token (CA3)
    - ✅ Política de contraseña aplicada (CA3)
    - ✅ Confirmación requerida (CA3)
    - ✅ Rechazo si token inválido/expirado (CA3)
    - ✅ Logout global (CA4)
    - ✅ Auditoría (CA4)
    """
    result = reset_password_with_token(db, data)
    
    # Limpiar cookie de sesión (logout global - CA4)
    response.delete_cookie("access_token")
    
    return result