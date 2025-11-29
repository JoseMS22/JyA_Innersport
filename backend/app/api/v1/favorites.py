# app/api/v1/favoritos.py
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.favoritos import Favorito
from app.models.variante import Variante
from app.models.producto import Producto
from app.models.media import Media
from app.schemas.favorites import (
    FavoriteFromApi,
    FavoritesResponse,
    ToggleFavoriteRequest,
)

router = APIRouter(prefix="/favoritos", tags=["Favoritos"])


def _build_favorite_from_model(fav: Favorito) -> FavoriteFromApi:
    variante: Variante = fav.variante
    producto: Producto = variante.producto

    principal: Optional[Media] = None
    if producto.media:
        principal = sorted(producto.media, key=lambda m: m.orden)[0]

    imagen_url = principal.url if principal else None

    precio = Decimal(variante.precio_actual or 0)

    return FavoriteFromApi(
        variante_id=variante.id,
        producto_id=producto.id,
        nombre_producto=producto.nombre,
        marca=variante.marca,
        precio=precio,
        imagen_url=imagen_url,
        color=variante.color,
        talla=variante.talla,
    )


# =========================
# GET /api/v1/favoritos
# =========================

@router.get("", response_model=FavoritesResponse)
def get_favorites(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Devuelve los favoritos del usuario actual.
    """
    favoritos = (
        db.query(Favorito)
        .filter(Favorito.usuario_id == current_user.id)
        .options(
          joinedload(Favorito.variante)
          .joinedload(Variante.producto)
          .joinedload(Producto.media)
        )
        .all()
    )

    items: List[FavoriteFromApi] = [
        _build_favorite_from_model(f) for f in favoritos
    ]

    return FavoritesResponse(items=items)


# =========================
# POST /api/v1/favoritos/toggle
# =========================

@router.post("/toggle", response_model=FavoritesResponse)
def toggle_favorite(
    payload: ToggleFavoriteRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Si la variante está en favoritos la quita, si no, la agrega.
    Devuelve la lista completa actualizada.
    """
    variante = (
        db.query(Variante)
        .options(
            joinedload(Variante.producto).joinedload(Producto.media)
        )
        .filter(Variante.id == payload.variante_id)
        .first()
    )
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )

    fav = (
        db.query(Favorito)
        .filter(
            Favorito.usuario_id == current_user.id,
            Favorito.variante_id == payload.variante_id,
        )
        .first()
    )

    if fav:
        db.delete(fav)
    else:
        nuevo = Favorito(
            usuario_id=current_user.id,
            variante_id=payload.variante_id,
        )
        db.add(nuevo)

    db.commit()

    # devolver lista actualizada
    return get_favorites(db=db, current_user=current_user)


# =========================
# (opcional) DELETE /api/v1/favoritos/{producto_id}
# =========================

@router.delete("/{producto_id}", response_model=FavoritesResponse)
def delete_favorites_by_product(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Elimina todos los favoritos del usuario para un producto dado.
    Útil si en el futuro manejas varias variantes del mismo producto.
    """
    # obtenemos todas las variantes de ese producto
    variantes_ids = [
        v.id
        for v in db.query(Variante).filter(Variante.producto_id == producto_id)
    ]

    if not variantes_ids:
        return get_favorites(db=db, current_user=current_user)

    db.query(Favorito).filter(
        Favorito.usuario_id == current_user.id,
        Favorito.variante_id.in_(variantes_ids),
    ).delete(synchronize_session=False)

    db.commit()

    return get_favorites(db=db, current_user=current_user)