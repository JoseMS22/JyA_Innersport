# app/api/v1/productos.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.producto import Producto
from app.models.categoria import Categoria
from app.models.media import Media
from app.schemas.producto import (
    ProductoCreate,
    ProductoUpdate,
    ProductoRead,
)
from app.schemas.media import MediaCreate, MediaRead

router = APIRouter()


@router.get("/", response_model=List[ProductoRead])
def listar_productos(
    solo_activos: bool = Query(False, description="Si es true, solo devuelve productos activos"),
    categoria_id: Optional[int] = Query(None, description="Filtrar por categoría"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Producto)
        .options(
            joinedload(Producto.categorias),
            joinedload(Producto.media),
        )
    )

    if solo_activos:
        query = query.filter(Producto.activo.is_(True))

    if categoria_id is not None:
        query = query.join(Producto.categorias).filter(Categoria.id == categoria_id)

    productos = query.order_by(Producto.nombre.asc()).all()
    return productos


@router.post("/", response_model=ProductoRead, status_code=status.HTTP_201_CREATED)
def crear_producto(
    data: ProductoCreate,
    db: Session = Depends(get_db),
):
    producto = Producto(
        nombre=data.nombre,
        descripcion=data.descripcion,
    )

    # Asociar categorías
    if data.categorias_ids:
        categorias = (
            db.query(Categoria)
            .filter(Categoria.id.in_(data.categorias_ids), Categoria.activo.is_(True))
            .all()
        )
        if len(categorias) != len(set(data.categorias_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Una o más categorías no existen o están inactivas.",
            )
        producto.categorias = categorias

    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@router.get("/{producto_id}", response_model=ProductoRead)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    producto = (
        db.query(Producto)
        .options(
            joinedload(Producto.categorias),
            joinedload(Producto.media),
        )
        .get(producto_id)
    )
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )
    return producto


@router.put("/{producto_id}", response_model=ProductoRead)
def actualizar_producto(
    producto_id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db),
):
    producto = (
        db.query(Producto)
        .options(
            joinedload(Producto.categorias),
            joinedload(Producto.media),
        )
        .get(producto_id)
    )
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    if data.nombre is not None:
        producto.nombre = data.nombre

    if data.descripcion is not None:
        producto.descripcion = data.descripcion

    if data.activo is not None:
        producto.activo = data.activo

    # Actualizar categorías si viene la lista
    if data.categorias_ids is not None:
        if len(data.categorias_ids) == 0:
            producto.categorias = []
        else:
            categorias = (
                db.query(Categoria)
                .filter(Categoria.id.in_(data.categorias_ids), Categoria.activo.is_(True))
                .all()
            )
            if len(categorias) != len(set(data.categorias_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Una o más categorías no existen o están inactivas.",
                )
            producto.categorias = categorias

    db.commit()
    db.refresh(producto)
    return producto


@router.patch("/{producto_id}/desactivar", response_model=ProductoRead)
def desactivar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    producto = db.query(Producto).get(producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    producto.activo = False
    db.commit()
    db.refresh(producto)
    return producto


# =========================
#  Media de producto
# =========================

@router.get("/{producto_id}/media", response_model=List[MediaRead])
def listar_media_producto(
    producto_id: int,
    db: Session = Depends(get_db),
):
    producto = db.query(Producto).get(producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    return producto.media


@router.post("/{producto_id}/media", response_model=MediaRead, status_code=status.HTTP_201_CREATED)
def agregar_media_producto(
    producto_id: int,
    data: MediaCreate,
    db: Session = Depends(get_db),
):
    producto = db.query(Producto).get(producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    media = Media(
        producto_id=producto_id,
        url=data.url,
        tipo=data.tipo,
        orden=data.orden or 0,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@router.delete("/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_media(
    media_id: int,
    db: Session = Depends(get_db),
):
    media = db.query(Media).get(media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media no encontrada.",
        )

    db.delete(media)
    db.commit()
    return
