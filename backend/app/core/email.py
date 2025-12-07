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

ESTADO_PEDIDO_TEXTOS = {
    "PAGADO": {
        "titulo": "¡Hemos recibido tu pedido!",
        "descripcion": "Tu pedido ha sido confirmado y estamos procesándolo para enviártelo lo antes posible.",
        "mensaje_extra": "En cuanto esté listo para envío, te avisaremos por este mismo medio.",
    },
    "EN_PREPARACION": {
        "titulo": "Estamos preparando tu pedido",
        "descripcion": "Nuestro equipo está alistando tus productos con todo el cuidado que merecen.",
        "mensaje_extra": "Te enviaremos otro correo cuando el pedido salga a camino.",
    },
    "ENVIADO": {
        "titulo": "Tu pedido va en camino",
        "descripcion": "Tu pedido ha sido enviado y llegará pronto a la dirección indicada.",
        "mensaje_extra": "Si el transportista ofrece seguimiento, recibirás la información correspondiente.",
    },
    "ENTREGADO": {
        "titulo": "Tu pedido ha sido entregado",
        "descripcion": "Según nuestro sistema, tu pedido ya fue entregado.",
        "mensaje_extra": "Esperamos que disfrutes tus productos. ¡Gracias por confiar en Innersport!",
    },
    "CANCELADO": {
        "titulo": "Tu pedido ha sido cancelado",
        "descripcion": "Tu pedido fue cancelado correctamente.",
        "mensaje_extra": "Si no reconoces esta acción o tienes dudas, contáctanos para ayudarte.",
    },
}



def send_pedido_estado_email(
    to_email: str,
    pedido_id: int,
    nuevo_estado: str,
):
    """
    Envía un correo al cliente cuando cambia el estado de su pedido.
    Usa Resend (igual que los otros correos).
    """

    textos = ESTADO_PEDIDO_TEXTOS.get(
        nuevo_estado,
        {
            "titulo": f"Actualización de tu pedido #{pedido_id}",
            "descripcion": "Tu pedido ha cambiado de estado.",
            "mensaje_extra": "",
        },
    )

    pedido_url = f"{settings.FRONTEND_BASE_URL}/account/orders/{pedido_id}"

    html_content = f"""
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f3f4f6; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.12);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #111827, #4b5563); padding: 20px 24px; color: #f9fafb;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.8; margin-bottom: 4px;">
            Actualización de pedido
          </div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 600;">
            {textos['titulo']}
          </h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">
            Pedido #{pedido_id}
          </p>
        </div>

        <!-- Contenido principal -->
        <div style="padding: 24px 24px 12px 24px;">
          <p style="margin: 0 0 12px; font-size: 14px; color: #111827;">
            {textos['descripcion']}
          </p>
          <p style="margin: 0 0 16px; font-size: 13px; color: #4b5563;">
            {textos.get('mensaje_extra', '')}
          </p>

          <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">
            Puedes ver el detalle completo de este pedido en tu cuenta de Innersport.
          </p>

          <a href="{pedido_url}"
             style="display: inline-block; margin-top: 16px; padding: 10px 22px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 13px; font-weight: 500;">
            Ver detalles del pedido
          </a>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 14px 24px; text-align: center; font-size: 11px; color: #9ca3af;">
          <p style="margin: 0 0 4px;">
            Innersport · Este es un correo automático, por favor no lo respondas.
          </p>
          <p style="margin: 0;">
            Si necesitas ayuda, contáctanos a través de nuestros canales oficiales.
          </p>
        </div>
      </div>
    </div>
    """

    try:
        response = resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": to_email,
            "subject": f"Innersport · Actualización de tu pedido #{pedido_id}",
            "html": html_content,
        })

        if not response or "id" not in response:
            raise Exception("Respuesta inválida de Resend")

    except Exception as e:
        print(f"[EMAIL PEDIDO] Error enviando correo de estado para pedido #{pedido_id}: {e}")

def send_rma_update_email(to_email: str, rma_id: int, estado: str, respuesta_admin: str = None):
    """
    Notifica al cliente cuando cambia el estado de su solicitud RMA.
    """
    subject = f"Actualización de Solicitud RMA #{rma_id} - Innersport"
    
    estado_texto = {
        "solicitado": "Recibida",
        "en_revision": "En Revisión",
        "aprobado": "Aprobada",
        "rechazado": "Rechazada",
        "completado": "Completada"
    }.get(estado, estado)

    mensaje_admin_html = f"""
    <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #a855f7; margin: 15px 0;">
        <strong>Mensaje del equipo:</strong><br>
        {respuesta_admin}
    </div>
    """ if respuesta_admin else ""

    html_content = f"""
        <h2>Actualización de tu Devolución/Cambio</h2>
        <p>Tu solicitud <strong>#{rma_id}</strong> ha cambiado de estado a: <strong>{estado_texto.upper()}</strong>.</p>
        
        {mensaje_admin_html}
        
        <p>Puedes ver más detalles ingresando a tu cuenta.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Innersport Support Team</p>
    """

    try:
        resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": to_email,
            "subject": subject,
            "html": html_content,
        })
    except Exception as e:
        print(f"Error enviando correo RMA: {e}")
