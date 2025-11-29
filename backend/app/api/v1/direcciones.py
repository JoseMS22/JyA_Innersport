# backend/app/api/v1/direcciones.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.direccion import DireccionCreate, DireccionUpdate, DireccionRead
from app.services import direccion_service

router = APIRouter()


@router.get("/", response_model=List[DireccionRead])
def listar_direcciones(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista todas las direcciones del usuario autenticado.
    """
    return direccion_service.obtener_direcciones_usuario(db, current_user.id)


@router.get("/predeterminada", response_model=DireccionRead)
def obtener_direccion_predeterminada(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene la dirección predeterminada del usuario.
    """
    direccion = direccion_service.obtener_direccion_predeterminada(db, current_user.id)
    
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tienes una dirección predeterminada configurada"
        )
    
    return direccion


@router.get("/{direccion_id}", response_model=DireccionRead)
def obtener_direccion(
    direccion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene una dirección específica del usuario.
    """
    direccion = direccion_service.obtener_direccion_por_id(db, direccion_id, current_user.id)
    
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )
    
    return direccion


@router.post("/", response_model=DireccionRead, status_code=status.HTTP_201_CREATED)
def crear_direccion(
    data: DireccionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crea una nueva dirección para el usuario autenticado.
    
    Si es la primera dirección, se marca automáticamente como predeterminada.
    Si se marca como predeterminada, las demás dejan de serlo.
    """
    return direccion_service.crear_direccion(db, current_user.id, data)


@router.put("/{direccion_id}", response_model=DireccionRead)
def actualizar_direccion(
    direccion_id: int,
    data: DireccionUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Actualiza una dirección existente del usuario.
    """
    return direccion_service.actualizar_direccion(db, direccion_id, current_user.id, data)


@router.patch("/{direccion_id}/predeterminada", response_model=DireccionRead)
def marcar_como_predeterminada(
    direccion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marca una dirección como predeterminada.
    Las demás direcciones dejan de ser predeterminadas automáticamente.
    """
    return direccion_service.marcar_como_predeterminada(db, direccion_id, current_user.id)


@router.delete("/{direccion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_direccion(
    direccion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina (desactiva) una dirección del usuario.
    
    Si era la predeterminada, otra dirección se marca automáticamente como predeterminada.
    """
    direccion_service.eliminar_direccion(db, direccion_id, current_user.id)
    return None