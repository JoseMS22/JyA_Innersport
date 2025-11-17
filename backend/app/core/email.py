# backend/app/core/email.py

import resend
from fastapi import HTTPException, status
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


def send_verification_email(to_email: str, verification_token: str):
    """
    Envia email real utilizando Resend API.
    """

    verify_url = f"{settings.FRONTEND_BASE_URL}/verify-email?token={verification_token}"

    html_content = f"""
        <p>Gracias por registrarte en <strong>Innersport</strong>.</p>
        <p>Haz clic en el siguiente enlace para verificar tu correo:</p>
        <p><a href="{verify_url}">Verificar mi cuenta</a></p>
        <p>Si no solicitaste este registro, ignora este mensaje.</p>
    """

    try:
        response = resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": to_email,
            "subject": "Verifica tu cuenta en Innersport",
            "html": html_content,
        })

        if not response or "id" not in response:
            raise Exception("Respuesta inválida de Resend")

    except Exception as e:
        print(f"Error enviando correo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo enviar el correo de verificación.",
        )


# 🆕 US-07 / RF10: Recuperación de Contraseña
def send_password_reset_email(to_email: str, reset_token: str):
    """
    Envía correo con enlace para restablecer contraseña.
    
    El enlace incluye el token que el usuario usará para cambiar su contraseña.
    El token tiene expiración de 30 minutos.
    """

    reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={reset_token}"

    html_content = f"""
        <h2>Recuperación de Contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Innersport</strong>.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p><a href="{reset_url}" style="display: inline-block; padding: 12px 24px; background-color: #a855f7; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Restablecer Contraseña</a></p>
        <p>Este enlace expirará en <strong>30 minutos</strong>.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
            Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá sin cambios.
            <br>
            Por seguridad, te recomendamos cambiar tu contraseña si no reconoces esta solicitud.
        </p>
    """

    try:
        response = resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": to_email,
            "subject": "Recuperación de Contraseña - Innersport",
            "html": html_content,
        })

        if not response or "id" not in response:
            raise Exception("Respuesta inválida de Resend")

    except Exception as e:
        print(f"Error enviando correo de recuperación: {e}")
        # NO lanzamos excepción para no revelar si el correo existe
        # Solo logueamos el error