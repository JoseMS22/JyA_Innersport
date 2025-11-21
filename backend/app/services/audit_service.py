# backend/app/services/audit_service.py

from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.models.auditoria import AuditoriaUsuario


def registrar_auditoria(
    db: Session,
    usuario_id: int,
    accion: str,
    entidad: str,
    entidad_id: Optional[int] = None,
    detalles: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditoriaUsuario:
    """
    Registra una acción de auditoría en la base de datos.
    
    Args:
        db: Sesión de base de datos
        usuario_id: ID del usuario que realizó la acción
        accion: Tipo de acción (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
        entidad: Nombre de la entidad afectada (Usuario, Producto, Pedido, etc.)
        entidad_id: ID de la entidad afectada (opcional)
        detalles: Información adicional en formato JSON o texto (opcional)
        ip_address: Dirección IP desde donde se realizó la acción (opcional)
    
    Returns:
        AuditoriaUsuario: Registro de auditoría creado
    """
    auditoria = AuditoriaUsuario(
        usuario_id=usuario_id,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        detalles=detalles,
        ip_address=ip_address,
        fecha=datetime.now(timezone.utc),
    )
    
    db.add(auditoria)
    db.commit()
    db.refresh(auditoria)
    
    return auditoria


def obtener_auditoria_usuario(
    db: Session,
    usuario_id: int,
    limit: int = 50,
) -> list[AuditoriaUsuario]:
    """
    Obtiene el historial de auditoría de un usuario específico.
    
    Args:
        db: Sesión de base de datos
        usuario_id: ID del usuario
        limit: Número máximo de registros a devolver
    
    Returns:
        Lista de registros de auditoría ordenados por fecha descendente
    """
    return (
        db.query(AuditoriaUsuario)
        .filter(AuditoriaUsuario.usuario_id == usuario_id)
        .order_by(AuditoriaUsuario.fecha.desc())
        .limit(limit)
        .all()
    )


def obtener_auditoria_entidad(
    db: Session,
    entidad: str,
    entidad_id: int,
    limit: int = 50,
) -> list[AuditoriaUsuario]:
    """
    Obtiene el historial de auditoría de una entidad específica.
    
    Args:
        db: Sesión de base de datos
        entidad: Nombre de la entidad (Usuario, Producto, Pedido, etc.)
        entidad_id: ID de la entidad
        limit: Número máximo de registros a devolver
    
    Returns:
        Lista de registros de auditoría ordenados por fecha descendente
    """
    return (
        db.query(AuditoriaUsuario)
        .filter(
            AuditoriaUsuario.entidad == entidad,
            AuditoriaUsuario.entidad_id == entidad_id,
        )
        .order_by(AuditoriaUsuario.fecha.desc())
        .limit(limit)
        .all()
    )


def obtener_auditoria_por_accion(
    db: Session,
    accion: str,
    limit: int = 100,
) -> list[AuditoriaUsuario]:
    """
    Obtiene registros de auditoría filtrados por tipo de acción.
    
    Args:
        db: Sesión de base de datos
        accion: Tipo de acción (LOGIN, CREATE, UPDATE, DELETE, etc.)
        limit: Número máximo de registros a devolver
    
    Returns:
        Lista de registros de auditoría ordenados por fecha descendente
    """
    return (
        db.query(AuditoriaUsuario)
        .filter(AuditoriaUsuario.accion == accion)
        .order_by(AuditoriaUsuario.fecha.desc())
        .limit(limit)
        .all()
    )