# backend/app/api/v1/catalogo.py
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy import func, and_, or_, distinct

from app.db import get_db
from app.models.producto import Producto
from app.models.variante import Variante
from app.models.categoria import Categoria
from app.models.inventario import Inventario
from app.models.media import Media
from pydantic import BaseModel
from datetime import datetime  # 👈 agrega esto arriba

from app.models.producto_categoria import ProductoCategoria  # 👈 importa la tabla pivote


router = APIRouter()


# 🔹 Schema de respuesta del catálogo
class VarianteMinima(BaseModel):
    id: int
    sku: str
    marca: Optional[str]
    color: Optional[str]
    talla: Optional[str]
    precio_actual: Decimal
    
    class Config:
        from_attributes = True


class ProductoCatalogo(BaseModel):
    id: int
    nombre: str
    precio_minimo: Decimal
    imagen_principal: Optional[str] = None
    categorias: List[str] = []
    tiene_stock: bool

    marca: Optional[str] = None          # 👈 NUEVO
    imagenes: list[str] = []             # 👈 aquí irán TODAS las fotos

    created_at: datetime

    class Config:
        from_attributes = True



class CatalogoResponse(BaseModel):
    productos: List[ProductoCatalogo]
    total: int
    pagina: int
    total_paginas: int
    por_pagina: int


# 🔹 Filtros disponibles
class FiltrosDisponibles(BaseModel):
    categorias: List[str]
    marcas: List[str]
    colores: List[str]
    tallas: List[str]
    precio_minimo: Decimal
    precio_maximo: Decimal


@router.get("/catalogo", response_model=CatalogoResponse)
def obtener_catalogo(
    # Paginación
    pagina: int = Query(1, ge=1, description="Número de página"),
    por_pagina: int = Query(12, ge=1, le=100, description="Productos por página"),
    
    # Filtros
    categoria: Optional[str] = Query(
        None,
        description="Nombre de categoría (búsqueda libre, opcional)"
    ),
    categoria_slug: Optional[str] = Query(
        None,
        description="Slug de categoría (para URLs limpias /categorias/[slug])"
    ),

    principal_slug: Optional[str] = Query(
        None,
        description="Slug de categoría principal (para combinación principal+secundaria)"
    ),
    secundaria_slug: Optional[str] = Query(
        None,
        description="Slug de categoría secundaria (para combinación principal+secundaria)"
    ),

    marca: Optional[str] = Query(None, description="Marca del producto"),
    color: Optional[str] = Query(None, description="Color disponible"),
    talla: Optional[str] = Query(None, description="Talla disponible"),
    precio_min: Optional[Decimal] = Query(None, ge=0, description="Precio mínimo"),
    precio_max: Optional[Decimal] = Query(None, ge=0, description="Precio máximo"),
    solo_disponibles: bool = Query(True, description="Solo productos con stock"),
    
    # Ordenamiento
    ordenar_por: str = Query(
        "destacados",
        description="Opciones: destacados, precio_asc, precio_desc, nombre_asc"
    ),
    
    # Búsqueda
    buscar: Optional[str] = Query(None, description="Búsqueda por nombre o SKU"),
    
    db: Session = Depends(get_db),
):
    """
    🎯 US-12 (RF11): Catálogo con filtros avanzados
    
    Criterios de aceptación:
    ✅ Muestra catálogo paginado
    ✅ Filtros: categoría, precio, talla, color, marca, disponibilidad
    ✅ Actualiza sin recargar (esto lo hace el frontend)
    ✅ Solo productos activos y disponibles
    ✅ Ordenamiento dinámico
    """
    
    # 1️⃣ Crear subconsulta para precio mínimo por producto (siempre necesaria)
    subq_precio = (
        db.query(
            Variante.producto_id,
            func.min(Variante.precio_actual).label('precio_min')
        )
        .filter(Variante.activo.is_(True))
        .group_by(Variante.producto_id)
        .subquery()
    )
    
    # 2️⃣ Query base: productos activos con precio
    query = (
        db.query(Producto, subq_precio.c.precio_min)
        .join(subq_precio, Producto.id == subq_precio.c.producto_id)
        .filter(Producto.activo.is_(True))
    )
    
        # 3️⃣ Filtro por disponibilidad (stock > 0)
    if solo_disponibles:
        subq_stock = (
            db.query(distinct(Variante.producto_id))
            .join(Inventario, Inventario.variante_id == Variante.id)
            .filter(
                Variante.activo.is_(True),
                Inventario.cantidad > 0
            )
            .subquery()
        )
        query = query.filter(Producto.id.in_(subq_stock))


    if principal_slug and secundaria_slug:
        # Queremos productos que tengan ambas categorías: la principal y la secundaria
        pc_principal = aliased(ProductoCategoria)
        pc_secundaria = aliased(ProductoCategoria)

        # Obtenemos los IDs de esas categorías por slug
        principal_id_subq = (
            db.query(Categoria.id)
            .filter(Categoria.slug == principal_slug)
            .scalar_subquery()
        )
        secundaria_id_subq = (
            db.query(Categoria.id)
            .filter(Categoria.slug == secundaria_slug)
            .scalar_subquery()
        )

        query = (
            query
            .join(pc_principal, pc_principal.producto_id == Producto.id)
            .join(pc_secundaria, pc_secundaria.producto_id == Producto.id)
            .filter(
                pc_principal.categoria_id == principal_id_subq,
                pc_secundaria.categoria_id == secundaria_id_subq,
            )
        )

    elif categoria_slug:
        # Filtro por un solo slug (para /categorias/ropa-deportiva)
        query = (
            query
            .join(Producto.categorias)
            .filter(Categoria.slug == categoria_slug)
        )

    elif categoria:
        # Filtro antiguo por nombre
        query = (
            query
            .join(Producto.categorias)
            .filter(Categoria.nombre.ilike(f"%{categoria}%"))
        )


    
    # 5️⃣ Filtro por marca (necesitamos join con variante)
    if marca:
        subq_marca = (
            db.query(distinct(Variante.producto_id))
            .filter(
                Variante.activo.is_(True),
                Variante.marca.ilike(f"%{marca}%")
            )
            .subquery()
        )
        query = query.filter(Producto.id.in_(subq_marca))
    
    # 6️⃣ Filtro por color
    if color:
        subq_color = (
            db.query(distinct(Variante.producto_id))
            .filter(
                Variante.activo.is_(True),
                Variante.color.ilike(f"%{color}%")
            )
            .subquery()
        )
        query = query.filter(Producto.id.in_(subq_color))
    
    # 7️⃣ Filtro por talla
    if talla:
        subq_talla = (
            db.query(distinct(Variante.producto_id))
            .filter(
                Variante.activo.is_(True),
                Variante.talla.ilike(f"%{talla}%")
            )
            .subquery()
        )
        query = query.filter(Producto.id.in_(subq_talla))
    
    # 8️⃣ Filtro por rango de precio (usando la subconsulta de precio)
    if precio_min is not None:
        query = query.filter(subq_precio.c.precio_min >= precio_min)
    
    if precio_max is not None:
        query = query.filter(subq_precio.c.precio_min <= precio_max)
    
    # 9️⃣ Búsqueda por texto
    if buscar:
        # Subconsulta para búsqueda por SKU
        subq_buscar_sku = (
            db.query(distinct(Variante.producto_id))
            .filter(Variante.sku.ilike(f"%{buscar}%"))
            .subquery()
        )
        
        query = query.filter(
            or_(
                Producto.nombre.ilike(f"%{buscar}%"),
                Producto.id.in_(subq_buscar_sku)
            )
        )
    
    # 🔟 Ordenamiento (ahora funciona porque precio_min está en el SELECT)
    if ordenar_por == "precio_asc":
        query = query.order_by(subq_precio.c.precio_min.asc())
    elif ordenar_por == "precio_desc":
        query = query.order_by(subq_precio.c.precio_min.desc())
    elif ordenar_por == "nombre_asc":
        query = query.order_by(Producto.nombre.asc())
    else:  # destacados (por defecto: más recientes)
        query = query.order_by(Producto.created_at.desc())
    
    # 1️⃣1️⃣ Total de resultados
    total = query.count()
    
    # 1️⃣2️⃣ Paginación
    offset = (pagina - 1) * por_pagina
    resultados = query.offset(offset).limit(por_pagina).all()
    
    # 1️⃣3️⃣ Construir respuesta con datos enriquecidos
    productos_catalogo: list[ProductoCatalogo] = []

    for producto, precio_minimo in resultados:
        # 🔹 Todas las imágenes del producto, ordenadas
        medias = (
            db.query(Media.url)
            .filter(Media.producto_id == producto.id)
            .order_by(Media.orden.asc(), Media.id.asc())
            .all()
        )
        imagenes_urls = [m[0] for m in medias]  # m es una tupla (url,)

        # Imagen principal = la primera, si existe
        imagen_principal_url = imagenes_urls[0] if imagenes_urls else None

        # 🔹 Categorías
        categorias_nombres = [cat.nombre for cat in producto.categorias]

        # 🔹 Verificar stock
        tiene_stock = (
            db.query(Inventario.cantidad)
            .join(Variante, Variante.id == Inventario.variante_id)
            .filter(
                Variante.producto_id == producto.id,
                Variante.activo.is_(True),
                Inventario.cantidad > 0,
            )
            .first() is not None
        )

        # 🔹 Marca (opcional)
        marca_row = (
            db.query(Variante.marca)
            .filter(
                Variante.producto_id == producto.id,
                Variante.activo.is_(True),
                Variante.marca.isnot(None),
            )
            .order_by(Variante.precio_actual.asc())
            .first()
        )
        marca = marca_row[0] if marca_row else None

        productos_catalogo.append(
            ProductoCatalogo(
                id=producto.id,
                nombre=producto.nombre,
                precio_minimo=precio_minimo or Decimal(0),
                imagen_principal=imagen_principal_url,
                categorias=categorias_nombres,
                tiene_stock=tiene_stock,
                marca=marca,
                imagenes=imagenes_urls,
                created_at=producto.created_at,
            )
        )

    # 1️⃣4️⃣ Calcular total de páginas
    total_paginas = (total + por_pagina - 1) // por_pagina

    return CatalogoResponse(
        productos=productos_catalogo,
        total=total,
        pagina=pagina,
        total_paginas=total_paginas,
        por_pagina=por_pagina,
    )


@router.get("/catalogo/filtros", response_model=FiltrosDisponibles)
def obtener_filtros_disponibles(db: Session = Depends(get_db)):
    """
    Devuelve los valores disponibles para cada filtro.
    Útil para poblar los selectores del frontend.
    """
    
    # Categorías activas
    categorias = (
        db.query(Categoria.nombre)
        .filter(Categoria.activo.is_(True))
        .distinct()
        .all()
    )
    
    # Marcas de variantes activas
    marcas = (
        db.query(Variante.marca)
        .filter(
            Variante.activo.is_(True),
            Variante.marca.isnot(None),
        )
        .distinct()
        .all()
    )
    
    # Colores disponibles
    colores = (
        db.query(Variante.color)
        .filter(
            Variante.activo.is_(True),
            Variante.color.isnot(None),
        )
        .distinct()
        .all()
    )
    
    # Tallas disponibles
    tallas = (
        db.query(Variante.talla)
        .filter(
            Variante.activo.is_(True),
            Variante.talla.isnot(None),
        )
        .distinct()
        .all()
    )
    
    # Rango de precios
    precios = (
        db.query(
            func.min(Variante.precio_actual),
            func.max(Variante.precio_actual),
        )
        .filter(Variante.activo.is_(True))
        .first()
    )
    
    return FiltrosDisponibles(
        categorias=[c[0] for c in categorias],
        marcas=[m[0] for m in marcas if m[0]],
        colores=[c[0] for c in colores if c[0]],
        tallas=[t[0] for t in tallas if t[0]],
        precio_minimo=precios[0] or Decimal(0),
        precio_maximo=precios[1] or Decimal(100000),
    )