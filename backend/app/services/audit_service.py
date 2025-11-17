# backend/app/services/audit_service.py

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request

from app.models.audit_log import AuditLog
from app.models.usuario import Usuario


def log_audit(
    db: Session,
    action_type: str,
    result: str,
    request: Optional[Request] = None,
    user: Optional[Usuario] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    changes_summary: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    correlation_id: Optional[str] = None,
) -> AuditLog:
    """
    Registra una acción en el log de auditoría.
    
    Args:
        db: Sesión de base de datos
        action_type: Tipo de acción (REGISTER, LOGIN, UPDATE_PROFILE, etc.)
        result: Resultado de la acción ("SUCCESS" o "ERROR")
        request: Request de FastAPI (para obtener IP y user-agent)
        user: Usuario que realizó la acción (None si anónimo)
        resource_type: Tipo de recurso afectado (USER, PROFILE, SESSION, etc.)
        resource_id: ID del recurso afectado
        changes_summary: Resumen de cambios (solo campos NO sensibles)
        error_message: Mensaje de error si result = ERROR
        metadata: Información adicional
        correlation_id: ID de correlación (se genera automáticamente si no se proporciona)
    
    Returns:
        AuditLog: Registro de auditoría creado
        
    Criterios de aceptación:
    - CA1: ✅ Timestamp ISO-8601, usuario, IP, user-agent
    - CA2: ✅ CorrelationId + resumen seguro
    - CA3: ✅ Append-only (nunca se actualiza, solo se inserta)
    """
    
    # Generar correlationId si no se proporciona
    if not correlation_id:
        correlation_id = str(uuid.uuid4())
    
    # Extraer información de la request si está disponible
    ip_address = None
    user_agent = None
    if request:
        # Obtener IP real (considerando proxies)
        ip_address = request.client.host if request.client else None
        if "x-forwarded-for" in request.headers:
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
        
        # Obtener user-agent
        user_agent = request.headers.get("user-agent")
    
    # Información del usuario
    user_id = user.id if user else None
    user_email = user.correo if user else None
    user_rol = user.rol if user else None
    
    # Crear registro de auditoría
    audit_entry = AuditLog(
        correlation_id=correlation_id,
        timestamp=datetime.now(timezone.utc),
        user_id=user_id,
        user_email=user_email,
        user_rol=user_rol,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        result=result,
        ip_address=ip_address,
        user_agent=user_agent,
        changes_summary=changes_summary,
        error_message=error_message,
        metadata=metadata,
    )
    
    # Guardar en BD (append-only)
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    
    # Log en consola (RNF17)
    log_level = "INFO" if result == "SUCCESS" else "ERROR"
    print(f"[{log_level}] [AUDIT] [{action_type}] User: {user_email or 'anónimo'}, "
          f"Result: {result}, CorrelationId: {correlation_id}")
    
    return audit_entry


def redact_sensitive_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Elimina campos sensibles de un diccionario antes de guardarlo en auditoría.
    
    Criterio CA2: Evitar almacenar contraseñas, tokens, tarjetas, PII sensible.
    
    Args:
        data: Diccionario con datos potencialmente sensibles
        
    Returns:
        Diccionario con campos sensibles redactados
    """
    sensitive_fields = {
        "password", "contrasena", "password_hash", "contrasena_hash",
        "token", "access_token", "refresh_token", "reset_token",
        "card_number", "cvv", "card_cvv", "tarjeta",
        "api_key", "secret_key", "private_key",
        "verification_token", "token_verificacion",
    }
    
    redacted = {}
    for key, value in data.items():
        if any(field in key.lower() for field in sensitive_fields):
            redacted[key] = "[REDACTED]"
        elif isinstance(value, dict):
            redacted[key] = redact_sensitive_fields(value)
        else:
            redacted[key] = value
    
    return redacted


def create_changes_summary(
    before: Optional[Dict[str, Any]],
    after: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Crea un resumen seguro de cambios entre dos estados.
    
    Criterio CA2: Solo campos NO sensibles.
    
    Args:
        before: Estado anterior
        after: Estado posterior
        
    Returns:
        Diccionario con resumen de cambios
    """
    if not before and not after:
        return {}
    
    before = before or {}
    after = after or {}
    
    # Redactar campos sensibles
    before_safe = redact_sensitive_fields(before)
    after_safe = redact_sensitive_fields(after)
    
    # Encontrar diferencias
    changes = {}
    all_keys = set(before_safe.keys()) | set(after_safe.keys())
    
    for key in all_keys:
        old_value = before_safe.get(key)
        new_value = after_safe.get(key)
        
        if old_value != new_value:
            changes[key] = {
                "before": old_value,
                "after": new_value,
            }
    
    return changes