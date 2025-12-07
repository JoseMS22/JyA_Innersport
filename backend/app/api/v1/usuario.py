# backend/app/api/v1/usuario.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Any

from app.db import get_db
from app.core.security import get_current_admin
from app.models.usuario import Usuario
from app.schemas.usuario import UserPublic, UserCreateAdmin, UserUpdateAdmin, UserListResponse
from app.services import usuario_service

router = APIRouter()

@router.get("/", response_model=UserListResponse)
def leer_usuarios(
    skip: int = 0,
    limit: int = 10,
    rol: str = Query(None, description="Filtrar por rol (ADMIN, VENDEDOR, CLIENTE)"),
    search: str = Query(None, description="Buscar por nombre o correo"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin), # 🔒 Solo Admins
) -> Any:
    """
    Lista todos los usuarios con paginación y filtros. Solo para administradores.
    """
    return usuario_service.get_users_admin(db, skip=skip, limit=limit, rol=rol, search=search)

@router.post("/", response_model=UserPublic)
def crear_usuario_admin(
    user_in: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin), # 🔒 Solo Admins
) -> Any:
    """
    Crea un nuevo usuario (Cliente, Vendedor o Admin) directamente.
    """
    return usuario_service.create_user_admin(db, user_in)

@router.get("/{user_id}", response_model=UserPublic)
def leer_usuario_detalle(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
) -> Any:
    """
    Obtiene el detalle de un usuario específico.
    """
    return usuario_service.get_user_by_id(db, user_id)

@router.put("/{user_id}", response_model=UserPublic)
def actualizar_usuario_admin(
    user_id: int,
    user_in: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
) -> Any:
    """
    Actualiza datos de un usuario (Rol, Estado, Contraseña, etc).
    """
    return usuario_service.update_user_admin(db, user_id, user_in)

@router.delete("/{user_id}")
def eliminar_usuario_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
) -> Any:
    """
    Elimina un usuario permanentemente.
    """
    # Evitar auto-eliminación
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta desde aquí.")
        
    user = usuario_service.delete_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    return {"message": "Usuario eliminado correctamente"}