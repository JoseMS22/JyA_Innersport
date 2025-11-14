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
