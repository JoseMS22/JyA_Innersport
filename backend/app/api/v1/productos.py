# app/api/v1/productos.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.producto import Producto
from app.models.categoria import Categoria
from app.models.media import Media
from sqlalchemy import or_, func
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

# =========================
#  Búsqueda con autocompletado de producto
# =========================

@router.get("/buscar", response_model=List[ProductoRead])
def buscar_productos(
    q: str = Query(..., min_length=2, description="Término de búsqueda (mínimo 2 caracteres)"),
    limit: int = Query(10, ge=1, le=50, description="Máximo de resultados"),
    db: Session = Depends(get_db),
):
    """
    US-13 / RF12: Búsqueda de productos con autocompletado.
    
    Criterios de aceptación:
    - Busca por nombre, SKU, código de barras o categoría
    - Prioriza coincidencias exactas y parciales
    - Solo muestra productos activos con variantes activas
    - Retorna máximo 10 resultados por defecto
    """
    
    # Normalizar término de búsqueda
    search_term = q.strip().lower()
    
    # Buscar productos que coincidan con el término
    # Orden de prioridad:
    # 1. Coincidencia exacta en nombre de producto
    # 2. Coincidencia parcial en nombre de producto
    # 3. Coincidencia en SKU o barcode de variante
    # 4. Coincidencia en categoría
    
    query = (
        db.query(Producto)
        .options(
            joinedload(Producto.categorias),
            joinedload(Producto.media),
            joinedload(Producto.variantes),
        )
        .filter(Producto.activo.is_(True))
    )
    
    # Construir filtros de búsqueda
    search_filters = []
    
    # Búsqueda en nombre del producto (case-insensitive)
    search_filters.append(
        func.lower(Producto.nombre).contains(search_term)
    )
    
    # Búsqueda en descripción del producto
    search_filters.append(
        func.lower(Producto.descripcion).contains(search_term)
    )
    
    # Búsqueda por SKU o barcode en variantes
    query = query.outerjoin(Variante)
    search_filters.append(
        func.lower(Variante.sku).contains(search_term)
    )
    search_filters.append(
        func.lower(Variante.barcode).contains(search_term)
    )
    
    # Búsqueda en nombre de categoría
    query = query.outerjoin(Producto.categorias)
    search_filters.append(
        func.lower(Categoria.nombre).contains(search_term)
    )
    
    # Aplicar filtros con OR
    query = query.filter(or_(*search_filters))
    
    # Ordenar por relevancia:
    # 1. Productos cuyo nombre empieza con el término (mayor prioridad)
    # 2. Productos cuyo nombre contiene el término
    # 3. Por nombre alfabéticamente
    query = query.order_by(
        func.lower(Producto.nombre).startswith(search_term).desc(),
        func.lower(Producto.nombre).contains(search_term).desc(),
        Producto.nombre.asc()
    )
    
    # Limitar resultados
    productos = query.distinct().limit(limit).all()
    
    # Filtrar solo productos con variantes activas y disponibles
    productos_disponibles = []
    for producto in productos:
        # Verificar si tiene al menos una variante activa
        tiene_variantes_activas = any(
            v.activo for v in producto.variantes
        )
        if tiene_variantes_activas:
            productos_disponibles.append(producto)
    
    return productos_disponibles


@router.get("/sugerencias", response_model=List[dict])
def obtener_sugerencias(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """
    Endpoint optimizado para autocompletado.
    Retorna solo información básica para sugerencias rápidas.
    """
    
    search_term = q.strip().lower()
    
    # Buscar productos
    productos = (
        db.query(
            Producto.id,
            Producto.nombre,
            Categoria.nombre.label("categoria_nombre")
        )
        .outerjoin(Producto.categorias)
        .filter(
            Producto.activo.is_(True),
            or_(
                func.lower(Producto.nombre).contains(search_term),
                func.lower(Categoria.nombre).contains(search_term)
            )
        )
        .order_by(
            func.lower(Producto.nombre).startswith(search_term).desc(),
            Producto.nombre.asc()
        )
        .distinct()
        .limit(limit)
        .all()
    )
    
    # Formatear respuesta para autocompletado
    sugerencias = []
    for producto in productos:
        sugerencias.append({
            "id": producto.id,
            "nombre": producto.nombre,
            "categoria": producto.categoria_nombre,
            "tipo": "producto"
        })
    
    # Buscar también en categorías
    categorias = (
        db.query(Categoria.id, Categoria.nombre)
        .filter(
            Categoria.activo.is_(True),
            func.lower(Categoria.nombre).contains(search_term)
        )
        .order_by(Categoria.nombre.asc())
        .limit(3)
        .all()
    )
    
    for categoria in categorias:
        sugerencias.append({
            "id": categoria.id,
            "nombre": categoria.nombre,
            "tipo": "categoria"
        })
    
    return sugerencias[:limit]