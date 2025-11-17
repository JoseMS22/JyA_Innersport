# backend/app/api/v1/audit.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.auditoria import AuditoriaPublic
from app.services.audit_service import (
    obtener_auditoria_usuario,
    obtener_auditoria_entidad,
    obtener_auditoria_por_accion,
)
from app.models.auditoria import AuditoriaUsuario

router = APIRouter()


def require_admin(current_user: Usuario = Depends(get_current_user)):
    """Dependencia que verifica que el usuario sea administrador."""
    if current_user.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este recurso.",
        )
    return current_user


@router.get(
    "/usuario/{usuario_id}",
    response_model=List[AuditoriaPublic],
    dependencies=[Depends(require_admin)],
)
def get_audit_by_user(
    usuario_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Obtiene el historial de auditoría de un usuario específico.
    Solo accesible para administradores.
    """
    registros = obtener_auditoria_usuario(db, usuario_id, limit)
    return registros


@router.get(
    "/entidad/{entidad}/{entidad_id}",
    response_model=List[AuditoriaPublic],
    dependencies=[Depends(require_admin)],
)
def get_audit_by_entity(
    entidad: str,
    entidad_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Obtiene el historial de auditoría de una entidad específica.
    Solo accesible para administradores.
    """
    registros = obtener_auditoria_entidad(db, entidad, entidad_id, limit)
    return registros


@router.get(
    "/accion/{accion}",
    response_model=List[AuditoriaPublic],
    dependencies=[Depends(require_admin)],
)
def get_audit_by_action(
    accion: str,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Obtiene registros de auditoría por tipo de acción.
    Solo accesible para administradores.
    
    Tipos de acción comunes:
    - LOGIN, LOGOUT, REGISTER
    - CREATE, UPDATE, DELETE
    - VERIFY_EMAIL, CHANGE_PASSWORD, RESET_PASSWORD
    - CREATE_ORDER, CANCEL_ORDER, etc.
    """
    registros = obtener_auditoria_por_accion(db, accion, limit)
    return registros


@router.get(
    "/me",
    response_model=List[AuditoriaPublic],
)
def get_my_audit(
    limit: int = Query(50, ge=1, le=200),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene el historial de auditoría del usuario autenticado.
    Cualquier usuario puede consultar su propio historial.
    """
    registros = obtener_auditoria_usuario(db, current_user.id, limit)
    return registros


@router.get(
    "/recent",
    response_model=List[AuditoriaPublic],
    dependencies=[Depends(require_admin)],
)
def get_recent_audit(
    limit: int = Query(100, ge=1, le=500),
    accion: Optional[str] = None,
    entidad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Obtiene los registros de auditoría más recientes del sistema.
    Opcionalmente filtra por acción y/o entidad.
    Solo accesible para administradores.
    """
    query = db.query(AuditoriaUsuario)
    
    if accion:
        query = query.filter(AuditoriaUsuario.accion == accion)
    
    if entidad:
        query = query.filter(AuditoriaUsuario.entidad == entidad)
    
    registros = (
        query
        .order_by(AuditoriaUsuario.fecha.desc())
        .limit(limit)
        .all()
    )
    
    return registros