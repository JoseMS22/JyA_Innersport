# app/api/v1/categorias.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.categoria import Categoria
from app.schemas.categoria import (
    CategoriaCreate,
    CategoriaUpdate,
    CategoriaRead,
)

from app.core.security import get_current_admin_user
from app.models.usuario import Usuario

router = APIRouter()


@router.get("/", response_model=List[CategoriaRead])
def listar_categorias(
    solo_activas: bool = Query(False, description="Si es true, solo devuelve categorías activas"),
    db: Session = Depends(get_db),
):
    query = db.query(Categoria)
    if solo_activas:
        query = query.filter(Categoria.activo.is_(True))
    return query.order_by(Categoria.nombre.asc()).all()


@router.post("/", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
def crear_categoria(
    data: CategoriaCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    # Validar nombre único
    existente = db.query(Categoria).filter(Categoria.nombre == data.nombre).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una categoría con ese nombre.",
        )

    categoria = Categoria(
        nombre=data.nombre,
        descripcion=data.descripcion,
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.get("/{categoria_id}", response_model=CategoriaRead)
def obtener_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
):
    categoria = db.query(Categoria).get(categoria_id)
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )
    return categoria


@router.put("/{categoria_id}", response_model=CategoriaRead)
def actualizar_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    categoria = db.query(Categoria).get(categoria_id)
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )

    if data.nombre is not None:
        # Validar nombre único si lo cambia
        existente = (
            db.query(Categoria)
            .filter(Categoria.nombre == data.nombre, Categoria.id != categoria_id)
            .first()
        )
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra categoría con ese nombre.",
            )
        categoria.nombre = data.nombre

    if data.descripcion is not None:
        categoria.descripcion = data.descripcion

    if data.activo is not None:
        categoria.activo = data.activo

    db.commit()
    db.refresh(categoria)
    return categoria


@router.patch("/{categoria_id}/desactivar", response_model=CategoriaRead)
def desactivar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    categoria = db.query(Categoria).get(categoria_id)
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )

    categoria.activo = False
    db.commit()
    db.refresh(categoria)
    return categoria

@router.patch("/{categoria_id}/activar", response_model=CategoriaRead)
def activar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    categoria = db.query(Categoria).get(categoria_id)
    if not categoria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )

    categoria.activo = True
    db.commit()
    db.refresh(categoria)
    return categoria
