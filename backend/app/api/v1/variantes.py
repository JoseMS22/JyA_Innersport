# app/api/v1/variantes.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.producto import Producto
from app.models.variante import Variante
from app.models.historial_precio import HistorialPrecio
from app.schemas.variante import (
    VarianteCreate,
    VarianteUpdate,
    VarianteRead,
    CambioPrecioRequest,
)
from app.schemas.historial_precio import HistorialPrecioRead
from app.services.precio import cambiar_precio_variante

from app.core.security import get_current_admin_user
from app.models.usuario import Usuario

router = APIRouter()

# =========================
#  Variantes por producto
# =========================

@router.get("/productos/{producto_id}/variantes", response_model=List[VarianteRead])
def listar_variantes_por_producto(
    producto_id: int,
    solo_activas: bool = Query(False, description="Si es true, solo variantes activas"),
    db: Session = Depends(get_db),
):
    producto = db.query(Producto).get(producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    query = (
        db.query(Variante)
        .options(joinedload(Variante.historial_precios))
        .filter(Variante.producto_id == producto_id)
    )

    if solo_activas:
        query = query.filter(Variante.activo.is_(True))

    return query.order_by(Variante.id.asc()).all()


@router.post("/productos/{producto_id}/variantes", response_model=VarianteRead, status_code=status.HTTP_201_CREATED)
def crear_variante(
    producto_id: int,
    data: VarianteCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    producto = db.query(Producto).get(producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado.",
        )

    # Validar SKU único
    existente_sku = db.query(Variante).filter(Variante.sku == data.sku).first()
    if existente_sku:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una variante con ese SKU.",
        )

    # Validar barcode único si se envía
    if data.barcode:
        existente_barcode = (
            db.query(Variante)
            .filter(Variante.barcode == data.barcode)
            .first()
        )
        if existente_barcode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una variante con ese código de barras.",
            )

    # 🆕 Incluir marca al crear la variante
    variante = Variante(
        producto_id=producto_id,
        sku=data.sku,
        barcode=data.barcode,
        marca=data.marca, 
        color=data.color,
        talla=data.talla,
        precio_actual=data.precio_actual,
    )
    db.add(variante)
    db.commit()
    db.refresh(variante)

    # Crear registro inicial en historial de precios
    cambiar_precio_variante(db, variante.id, data.precio_actual)

    db.refresh(variante)
    return variante


# =========================
#  Variantes por ID
# =========================

@router.get("/variantes/{variante_id}", response_model=VarianteRead)
def obtener_variante(
    variante_id: int,
    db: Session = Depends(get_db),
):
    variante = (
        db.query(Variante)
        .options(joinedload(Variante.historial_precios))
        .get(variante_id)
    )
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )
    return variante


@router.put("/variantes/{variante_id}", response_model=VarianteRead)
def actualizar_variante(
    variante_id: int,
    data: VarianteUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    variante = db.query(Variante).get(variante_id)
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )

    # Validar cambios de SKU
    if data.sku is not None and data.sku != variante.sku:
        existente_sku = (
            db.query(Variante)
            .filter(Variante.sku == data.sku, Variante.id != variante_id)
            .first()
        )
        if existente_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra variante con ese SKU.",
            )
        variante.sku = data.sku

    # Validar cambios de barcode
    if data.barcode is not None and data.barcode != variante.barcode:
        existente_barcode = (
            db.query(Variante)
            .filter(Variante.barcode == data.barcode, Variante.id != variante_id)
            .first()
        )
        if existente_barcode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra variante con ese código de barras.",
            )
        variante.barcode = data.barcode

    # Marca 👇
    if data.marca is not None:
        variante.marca = data.marca

    if data.color is not None:
        variante.color = data.color

    if data.talla is not None:
        variante.talla = data.talla

    # Si viene precio_actual, usamos la lógica de cambio de precio
    if data.precio_actual is not None:
        cambiar_precio_variante(db, variante_id, data.precio_actual)
        # cambiar_precio_variante ya hace commit y refresh,
        # así que podemos devolver directamente la variante al final.
        variante = (
            db.query(Variante)
            .options(joinedload(Variante.historial_precios))
            .get(variante_id)
        )
        # activo se maneja abajo si viene.
    else:
        if data.activo is not None:
            variante.activo = data.activo
        db.commit()
        db.refresh(variante)

    variante = (
        db.query(Variante)
        .options(joinedload(Variante.historial_precios))
        .get(variante_id)
    )
    return variante


@router.patch("/variantes/{variante_id}/desactivar", response_model=VarianteRead)
def desactivar_variante(
    variante_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    variante = db.query(Variante).get(variante_id)
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )

    variante.activo = False
    db.commit()
    db.refresh(variante)
    return variante


# =========================
#  Historial de precios
# =========================

@router.get(
    "/variantes/{variante_id}/historial-precio",
    response_model=List[HistorialPrecioRead],
)
def listar_historial_precios(
    variante_id: int,
    db: Session = Depends(get_db),
):
    variante = db.query(Variante).get(variante_id)
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )

    historial = (
        db.query(HistorialPrecio)
        .filter(HistorialPrecio.variante_id == variante_id)
        .order_by(HistorialPrecio.vigente_desde.desc())
        .all()
    )
    return historial


@router.post(
    "/variantes/{variante_id}/cambiar-precio",
    response_model=VarianteRead,
)
def cambiar_precio(
    variante_id: int,
    data: CambioPrecioRequest,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    cambiar_precio_variante(db, variante_id, data.nuevo_precio)
    variante = (
        db.query(Variante)
        .options(joinedload(Variante.historial_precios))
        .get(variante_id)
    )
    if not variante:
        # En teoría no debería pasar porque ya validamos adentro,
        # pero por si acaso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )
    return variante
