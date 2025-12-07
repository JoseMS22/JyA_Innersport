# backend/app/api/v1/usuarios.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioRead
from app.core.security import get_current_user  

router = APIRouter()


@router.get("", response_model=List[UsuarioRead])
def listar_usuarios(
    rol: Optional[str] = Query(None, description="Filtrar por rol: ADMIN, VENDEDOR, CLIENTE"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Listar usuarios con filtros opcionales
    
    - **rol**: Filtrar por rol (ADMIN, VENDEDOR, CLIENTE)
    - **activo**: Filtrar por estado activo (true/false)
    - **skip**: Número de registros a saltar (paginación)
    - **limit**: Número máximo de registros a retornar
    """
    query = db.query(Usuario)
    
    # Filtro por rol
    if rol:
        query = query.filter(Usuario.rol == rol.upper())
    
    # Filtro por estado activo
    if activo is not None:
        query = query.filter(Usuario.activo == activo)
    
    # Paginación
    usuarios = query.offset(skip).limit(limit).all()
    
    return usuarios


@router.get("/{usuario_id}", response_model=UsuarioRead)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtener un usuario por ID
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return usuario