from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.models.producto_categoria import ProductoCategoria 
from app.db import get_db
from app.models.categoria import Categoria
from app.schemas.categoria import (
    CategoriaCreate,
    CategoriaUpdate,
    CategoriaRead,
    CategoriaMenuRead,
)

from app.core.security import get_current_admin_user
from app.models.usuario import Usuario

import re
import unicodedata

def slugify(text: str) -> str:
    """
    Convierte 'Ropa Hombre' -> 'ropa-hombre'
    No es super sofisticado pero sirve.
    """
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "categoria"

def generar_slug_unico(db: Session, base_text: str, categoria_id: int | None = None) -> str:
    base = slugify(base_text)
    slug = base
    i = 1

    while True:
        q = db.query(Categoria).filter(Categoria.slug == slug)
        if categoria_id is not None:
            q = q.filter(Categoria.id != categoria_id)

        existente = q.first()
        if not existente:
            return slug

        i += 1
        slug = f"{base}-{i}"

router = APIRouter()


@router.get("/", response_model=List[CategoriaRead])
def listar_categorias(
    solo_activas: bool = Query(
        False, description="Si es true, solo devuelve categorías activas"
    ),
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

    # ⚠️ No puede ser a la vez principal y secundaria
    if data.principal and data.secundaria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Una categoría no puede ser principal y secundaria al mismo tiempo.",
        )

    if data.secundaria and (not data.principales_ids or len(data.principales_ids) == 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Una categoría secundaria debe tener al menos una categoría principal asociada.",
        )

    slug = generar_slug_unico(db, data.nombre)

    categoria = Categoria(
        nombre=data.nombre,
        descripcion=data.descripcion,
        activo=True,
        principal=data.principal,
        secundaria=data.secundaria,
        slug=slug,
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)

    # Si es secundaria y viene lista de principales, las asociamos
    if categoria.secundaria and data.principales_ids:
        principales = (
            db.query(Categoria)
            .filter(
                Categoria.id.in_(data.principales_ids),
                Categoria.principal.is_(True),
            )
            .all()
        )
        categoria.principales = principales
        db.commit()
        db.refresh(categoria)

    return categoria


@router.get("/menu", response_model=list[CategoriaMenuRead])
def get_categorias_menu(db: Session = Depends(get_db)):
    from sqlalchemy.orm import aliased
    from app.models.categoria import Categoria
    from app.models.producto import Producto
    from app.models.producto_categoria import ProductoCategoria

    # alias para la tabla de relación many-to-many
    pc_principal = aliased(ProductoCategoria)
    pc_secundaria = aliased(ProductoCategoria)

    # Categorías principales activas
    principales = (
        db.query(Categoria)
        .filter(Categoria.activo.is_(True), Categoria.principal.is_(True))
        .all()
    )

    resultado: list[CategoriaMenuRead] = []

    for cat in principales:
        # 1) Productos que tienen asignada directamente esta categoría principal
        productos_count = (
            db.query(Producto.id)
            .join(ProductoCategoria, ProductoCategoria.producto_id == Producto.id)
            .filter(
                Producto.activo.is_(True),
                ProductoCategoria.categoria_id == cat.id,
            )
            .distinct()
            .count()
        )

        # 2) Secundarias de esta principal, pero contando SOLO productos que tengan
        #    la combinación (principal, secundaria) al mismo tiempo.
        secundarias_result: list[CategoriaMenuRead] = []
        for sub in cat.secundarias:  # relación .secundarias del modelo Categoria
            if not sub.activo or not sub.secundaria:
                continue

            sub_productos_count = (
                db.query(Producto.id)
                # producto_categoria para principal
                .join(pc_principal, pc_principal.producto_id == Producto.id)
                # producto_categoria para secundaria
                .join(pc_secundaria, pc_secundaria.producto_id == Producto.id)
                .filter(
                    Producto.activo.is_(True),
                    pc_principal.categoria_id == cat.id,  # principal actual
                    pc_secundaria.categoria_id == sub.id, # secundaria actual
                )
                .distinct()
                .count()
            )

            if sub_productos_count > 0:
                secundarias_result.append(
                    CategoriaMenuRead(
                        id=sub.id,
                        slug=sub.slug,
                        nombre=sub.nombre,
                        principal=sub.principal,
                        secundaria=sub.secundaria,
                        productos_count=sub_productos_count,
                        secundarias=[],  # no usamos sub-subcategorías aquí
                    )
                )

        # 3) Si la principal no tiene productos directos NI secundarias con productos (para ella),
        #    no la mandamos al frontend.
        if productos_count == 0 and not secundarias_result:
            continue

        resultado.append(
            CategoriaMenuRead(
                id=cat.id,
                slug=cat.slug,
                nombre=cat.nombre,
                principal=cat.principal,
                secundaria=cat.secundaria,
                productos_count=productos_count,
                secundarias=secundarias_result,
            )
        )

    return resultado



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
        categoria.slug = generar_slug_unico(db, data.nombre, categoria_id=categoria_id)

    if data.descripcion is not None:
        categoria.descripcion = data.descripcion

    if data.activo is not None:
        categoria.activo = data.activo

    # Actualizar flags principal/secundaria si vienen en el payload
    if data.principal is not None:
        categoria.principal = data.principal

    if data.secundaria is not None:
        categoria.secundaria = data.secundaria

    # ⚠️ Validar que no quede en un estado inválido
    if categoria.principal and categoria.secundaria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Una categoría no puede ser principal y secundaria al mismo tiempo.",
        )

    # Actualizar relación con sus categorías principales (si es secundaria)
    if data.principales_ids is not None:
        if categoria.secundaria:
            principales = (
                db.query(Categoria)
                .filter(
                    Categoria.id.in_(data.principales_ids),
                    Categoria.principal.is_(True),
                )
                .all()
            )
            categoria.principales = principales
        else:
            # Si ya no es secundaria, limpiamos sus principales
            categoria.principales = []

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

