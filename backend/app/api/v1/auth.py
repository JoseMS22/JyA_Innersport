# backend/app/api/v1/auth.py

from fastapi import APIRouter, Depends, status, Response, HTTPException, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.usuario import UserCreate, UserPublic, UserUpdate
from app.schemas.auth import (
    LoginSchema,
    Token,
    VerifyEmailSchema,
    DeleteAccountSchema,
    DeleteAccountResponse,
    ChangePasswordSchema,  
    ForgotPasswordRequest,  
    ResetPasswordRequest,
    ReactivateAccountResponse,  
)
from app.services.usuario_service import (
    GRACE_DAYS,
    create_user,
    login_user,
    verify_email,
    request_account_deletion,
    delete_user,
    update_profile,
    change_password,  
    request_password_reset,  
    reset_password_with_token,
    reactivate_account,  
)
from app.services.audit_service import registrar_auditoria
from app.core.security import get_current_user, create_access_token
from app.core.config import settings
from app.core.request_utils import get_client_ip
from app.core.logging_config import get_logger, get_audit_logger
from app.models.usuario import Usuario

router = APIRouter()
logger = get_logger(__name__)
audit_logger = get_audit_logger()


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
    request: Request,
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
    ip_address = get_client_ip(request)
    
    try:
        usuario = create_user(db, user_in)
        
        # 🔹 Registrar auditoría
        registrar_auditoria(
            db=db,
            usuario_id=usuario.id,
            accion="REGISTER",
            entidad="Usuario",
            entidad_id=usuario.id,
            detalles=f"Usuario registrado: {usuario.correo}",
            ip_address=ip_address,
        )
        
        logger.info(f"Nuevo usuario registrado: {usuario.correo} (ID: {usuario.id})")
        audit_logger.info(f"REGISTER | Usuario: {usuario.correo} | IP: {ip_address}")
        
        return usuario
        
    except Exception as e:
        logger.error(f"Error en registro de usuario: {str(e)}")
        raise


# =========================
# US-02: Login (HttpOnly cookie)
# =========================

@router.post(
    "/login",
    response_model=Token,
)
def login(
    login_in: LoginSchema,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Autentica al usuario y devuelve un access_token JWT.
    Además, guarda el token en una cookie HttpOnly (access_token).
    """
    ip_address = get_client_ip(request)
    
    try:
        access_token = login_user(db, login_in)
        
        # Obtener usuario para auditoría
        usuario = db.query(Usuario).filter(Usuario.correo == login_in.correo).first()
        
        # 🔹 Registrar auditoría
        if usuario:
            registrar_auditoria(
                db=db,
                usuario_id=usuario.id,
                accion="LOGIN",
                entidad="Usuario",
                entidad_id=usuario.id,
                detalles=f"Login exitoso",
                ip_address=ip_address,
            )
            
            logger.info(f"Login exitoso: {usuario.correo} desde IP {ip_address}")
            audit_logger.info(f"LOGIN | Usuario: {usuario.correo} | IP: {ip_address}")

        # Cookie de sesión
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            samesite="lax",
            secure=False,
            path="/",
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
        }
        
    except Exception as e:
        logger.warning(f"Intento de login fallido: {login_in.correo} | IP: {ip_address}")
        raise


# =========================
# Logout
# =========================

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Elimina la cookie de sesión (access_token).
    No requiere autenticación estricta - si no hay sesión, simplemente limpia la cookie.
    """
    ip_address = get_client_ip(request)
    
    try:
        # Intentar obtener usuario actual para auditoría
        token = request.cookies.get("access_token")
        current_user = None
        
        if token:
            try:
                # Intentar decodificar sin lanzar excepciones
                from app.core.security import _decode_token
                payload = _decode_token(token)
                user_id = int(payload.get("sub", 0))
                if user_id > 0:
                    current_user = db.query(Usuario).filter(Usuario.id == user_id).first()
            except:
                pass  # Si falla, simplemente no registramos auditoría
        
        # 🔹 Registrar auditoría solo si hay usuario
        if current_user:
            registrar_auditoria(
                db=db,
                usuario_id=current_user.id,
                accion="LOGOUT",
                entidad="Usuario",
                entidad_id=current_user.id,
                detalles=f"Logout de {current_user.correo}",
                ip_address=ip_address,
            )
            
            logger.info(f"Logout: {current_user.correo} desde IP {ip_address}")
            audit_logger.info(f"LOGOUT | Usuario: {current_user.correo} | IP: {ip_address}")
        
        # 🔹 SIEMPRE eliminar la cookie, aunque no haya usuario
        response.delete_cookie(
            key="access_token",
            path="/",
            domain=None,
            samesite="lax",
        )
        
        print(f"[DEBUG] Cookie access_token eliminada para IP {ip_address}")
        
        return {"message": "Sesión cerrada correctamente."}
        
    except Exception as e:
        logger.error(f"Error en logout: {str(e)}")
        # Aún así, intentar eliminar la cookie
        response.delete_cookie(
            key="access_token",
            path="/",
            domain=None,
            samesite="lax",
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
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Verifica el correo de un usuario a partir del token de verificación.
    """
    ip_address = get_client_ip(request)
    
    try:
        usuario = verify_email(db, payload.token)
        
        # 🔹 Registrar auditoría
        registrar_auditoria(
            db=db,
            usuario_id=usuario.id,
            accion="VERIFY_EMAIL",
            entidad="Usuario",
            entidad_id=usuario.id,
            detalles=f"Email verificado: {usuario.correo}",
            ip_address=ip_address,
        )
        
        logger.info(f"Email verificado: {usuario.correo}")
        audit_logger.info(f"VERIFY_EMAIL | Usuario: {usuario.correo} | IP: {ip_address}")
        
        return {
            "message": "Correo verificado correctamente. Ya puedes iniciar sesión.",
            "correo": usuario.correo,
        }
        
    except Exception as e:
        logger.error(f"Error en verificación de email: {str(e)}")
        raise


# =========================
# Info de usuario autenticado
# =========================

@router.get("/me", response_model=UserPublic)
def read_me(current_user: Usuario = Depends(get_current_user)):
    """
    Devuelve el perfil del usuario autenticado.
    """
    return current_user


# =========================
# US-03: Actualizar perfil
# =========================

@router.put("/me", response_model=UserPublic)
def update_me(
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Actualiza perfil del usuario autenticado.
    """
    ip_address = get_client_ip(request)
    
    try:
        # Capturar valores antiguos para auditoría
        campos_modificados = []
        if payload.nombre and payload.nombre != current_user.nombre:
            campos_modificados.append(f"nombre: {current_user.nombre} → {payload.nombre}")
        if payload.telefono and payload.telefono != current_user.telefono:
            campos_modificados.append(f"telefono: {current_user.telefono} → {payload.telefono}")
        
        usuario_actualizado = update_profile(db, current_user, payload)
        
        # 🔹 Registrar auditoría
        registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            accion="UPDATE",
            entidad="Usuario",
            entidad_id=current_user.id,
            detalles=f"Perfil actualizado. Campos: {', '.join(campos_modificados) if campos_modificados else 'sin cambios'}",
            ip_address=ip_address,
        )
        
        logger.info(f"Perfil actualizado: {current_user.correo}")
        audit_logger.info(f"UPDATE | Usuario: {current_user.correo} | Perfil actualizado | IP: {ip_address}")
        
        return usuario_actualizado
        
    except Exception as e:
        logger.error(f"Error actualizando perfil: {str(e)}")
        raise


# =========================
# Eliminación directa por ID (admin)
# =========================

@router.delete(
    "/{user_id}",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
)
def delete_usuario(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Elimina un usuario por ID (uso administrativo).
    Solo administradores pueden ejecutar esta acción.
    """
    ip_address = get_client_ip(request)
    
    # Verificar que el usuario actual sea admin
    if current_user.rol != "ADMIN":
        logger.warning(
            f"Intento de eliminación no autorizado por {current_user.correo} | IP: {ip_address}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción.",
        )
    
    try:
        usuario = delete_user(db, user_id)

        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado.",
            )
        
        # 🔹 Registrar auditoría
        registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            accion="DELETE",
            entidad="Usuario",
            entidad_id=user_id,
            detalles=f"Usuario {usuario.correo} eliminado por admin {current_user.correo}",
            ip_address=ip_address,
        )
        
        logger.info(f"Usuario eliminado por admin: {usuario.correo} (por {current_user.correo})")
        audit_logger.info(
            f"DELETE | Admin: {current_user.correo} eliminó a {usuario.correo} | IP: {ip_address}"
        )

        return usuario
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando usuario: {str(e)}")
        raise


# =========================
# US-04: Eliminación de cuenta propia
# =========================

@router.post(
    "/delete-account",
    response_model=DeleteAccountResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def delete_my_account(
    payload: DeleteAccountSchema,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    US-04: Como usuario quiero eliminar mi cuenta.
    """
    ip_address = get_client_ip(request)
    
    try:
        usuario = request_account_deletion(
            db=db,
            usuario=current_user,
            delete_in=payload,
        )
        
        # 🔹 Registrar auditoría
        registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            accion="REQUEST_DELETE_ACCOUNT",
            entidad="Usuario",
            entidad_id=current_user.id,
            detalles=f"Usuario {current_user.correo} solicitó eliminación de cuenta. Eliminación programada para {GRACE_DAYS} días.",
            ip_address=ip_address,
        )
        
        logger.info(
            f"Eliminación de cuenta solicitada: {current_user.correo} | "
            f"Programada para: {usuario.eliminacion_programada_at}"
        )
        audit_logger.info(
            f"REQUEST_DELETE_ACCOUNT | Usuario: {current_user.correo} | IP: {ip_address}"
        )

        response.delete_cookie(
            "access_token",
            httponly=True,
            samesite="lax",
            secure=False,
            path="/",
        )

        return DeleteAccountResponse(
            detail=(
                "Tu cuenta ha sido desactivada y se ha iniciado el proceso de eliminación. "
                f"Será eliminada de forma irreversible después de {GRACE_DAYS} días."
            ),
            deletion_scheduled_for=(
                usuario.eliminacion_programada_at.isoformat()
                if usuario.eliminacion_programada_at
                else None
            ),
        )
        
    except Exception as e:
        logger.error(f"Error en solicitud de eliminación de cuenta: {str(e)}")
        raise

# =========================
# US-04: Reactivación de cuenta en periodo de gracia
# =========================

@router.post("/reactivate-account", response_model=ReactivateAccountResponse)
def reactivate_account_endpoint(
    data: LoginSchema,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Reactiva una cuenta en periodo de gracia y genera de nuevo el JWT en cookie.
    """

    usuario = reactivate_account(db, data)

    token_data = {
        "sub": str(usuario.id),
        "rol": usuario.rol,
    }
    access_token = create_access_token(token_data)

    # 🧁 Setear cookie HttpOnly igual que en tu login
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,  # o True/False según tengas
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return {"detail": "Tu cuenta ha sido reactivada correctamente."}

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
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite a un usuario autenticado cambiar su contraseña.
    """
    ip_address = get_client_ip(request)
    
    try:
        change_password(db, current_user, data)
        
        # 🔹 Registrar auditoría
        registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            accion="CHANGE_PASSWORD",
            entidad="Usuario",
            entidad_id=current_user.id,
            detalles=f"Contraseña cambiada por el usuario {current_user.correo}",
            ip_address=ip_address,
        )
        
        logger.info(f"Contraseña cambiada: {current_user.correo}")
        audit_logger.info(
            f"CHANGE_PASSWORD | Usuario: {current_user.correo} | IP: {ip_address}"
        )
        
        return {
            "message": "Contraseña actualizada correctamente.",
            "usuario": current_user.correo,
        }
        
    except Exception as e:
        logger.error(f"Error cambiando contraseña: {str(e)}")
        raise


# =========================
# US-07: Recuperación de Contraseña
# =========================

@router.post(
    "/forgot-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Solicita recuperación de contraseña.
    """
    ip_address = get_client_ip(request)
    
    try:
        result = request_password_reset(db, data)
        
        # Buscar usuario para auditoría (si existe)
        usuario = db.query(Usuario).filter(Usuario.correo == data.correo).first()
        
        if usuario:
            # 🔹 Registrar auditoría
            registrar_auditoria(
                db=db,
                usuario_id=usuario.id,
                accion="FORGOT_PASSWORD",
                entidad="Usuario",
                entidad_id=usuario.id,
                detalles=f"Solicitud de recuperación de contraseña para {data.correo}",
                ip_address=ip_address,
            )
            
            logger.info(f"Solicitud de recuperación de contraseña: {data.correo}")
            audit_logger.info(
                f"FORGOT_PASSWORD | Usuario: {data.correo} | IP: {ip_address}"
            )
        else:
            # Registrar intento aunque no exista el usuario (para seguridad)
            logger.warning(
                f"Solicitud de recuperación para email no existente: {data.correo} | IP: {ip_address}"
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error en forgot password: {str(e)}")
        raise


@router.post(
    "/reset-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Restablece contraseña con token de recuperación.
    """
    ip_address = get_client_ip(request)
    
    try:
        result = reset_password_with_token(db, data)
        
        # Buscar usuario por token para auditoría
        usuario = db.query(Usuario).filter(
            Usuario.reset_password_token == data.token
        ).first()
        
        if usuario:
            # 🔹 Registrar auditoría
            registrar_auditoria(
                db=db,
                usuario_id=usuario.id,
                accion="RESET_PASSWORD",
                entidad="Usuario",
                entidad_id=usuario.id,
                detalles=f"Contraseña restablecida mediante token para {usuario.correo}",
                ip_address=ip_address,
            )
            
            logger.info(f"Contraseña restablecida: {usuario.correo}")
            audit_logger.info(
                f"RESET_PASSWORD | Usuario: {usuario.correo} | IP: {ip_address}"
            )
        
        # Logout global
        response.delete_cookie("access_token")
        
        return result
        
    except Exception as e:
        logger.error(f"Error en reset password: {str(e)}")
        raise