# app/api/v1/inventario.py
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.inventario import Inventario
from app.models.movimiento_inventario import MovimientoInventario
from app.models.producto import Producto
from app.models.variante import Variante
from app.schemas.inventario import (
    InventarioRead,
    AjusteInventarioRequest,
)
from app.schemas.movimiento_inventario import MovimientoInventarioRead
from app.services.inventario import ajustar_inventario

from app.core.security import get_current_staff_user
from app.models.usuario import Usuario

router = APIRouter()


@router.get("/", response_model=List[InventarioRead])
def listar_inventario(
    sucursal_id: Optional[int] = Query(None),
    variante_id: Optional[int] = Query(None),
    producto_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    staff: Usuario = Depends(get_current_staff_user),
):
    query = db.query(Inventario).options(
        joinedload(Inventario.variante).joinedload(Variante.producto),
        joinedload(Inventario.sucursal),
    )

    if sucursal_id is not None:
        query = query.filter(Inventario.sucursal_id == sucursal_id)

    if variante_id is not None:
        query = query.filter(Inventario.variante_id == variante_id)

    if producto_id is not None:
        query = query.join(Inventario.variante).filter(Variante.producto_id == producto_id)

    inventario = query.all()
    return inventario


@router.get("/{sucursal_id}/{variante_id}", response_model=InventarioRead)
def obtener_inventario_detalle(
    sucursal_id: int,
    variante_id: int,
    db: Session = Depends(get_db),
    staff: Usuario = Depends(get_current_staff_user),
):
    inv = (
        db.query(Inventario)
        .options(
            joinedload(Inventario.variante),
            joinedload(Inventario.sucursal),
        )
        .filter(
            Inventario.sucursal_id == sucursal_id,
            Inventario.variante_id == variante_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(
            status_code=404,
            detail="No hay registro de inventario para esa sucursal y variante.",
        )
    return inv


@router.post("/ajustar", response_model=InventarioRead)
def ajustar_stock(
    data: AjusteInventarioRequest,
    db: Session = Depends(get_db),
    staff: Usuario = Depends(get_current_staff_user),
):
    inv = ajustar_inventario(
        db,
        variante_id=data.variante_id,
        sucursal_id=data.sucursal_id,
        tipo=data.tipo,
        cantidad=data.cantidad,
        motivo=data.motivo,
        referencia=data.referencia,
        min_stock=data.min_stock,
        source_type="AJUSTE_MANUAL",
        usuario_id=staff.id,
    )

    inv = (
        db.query(Inventario)
        .options(
            joinedload(Inventario.variante),
            joinedload(Inventario.sucursal),
        )
        .get(inv.id)
    )
    return inv


@router.get("/movimientos", response_model=List[MovimientoInventarioRead])
def listar_movimientos(
    sucursal_id: Optional[int] = Query(None),
    variante_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    fecha_desde: Optional[datetime] = Query(None),
    fecha_hasta: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    staff: Usuario = Depends(get_current_staff_user),
):
    query = db.query(MovimientoInventario).options(
        joinedload(MovimientoInventario.usuario)  # 👈 cargar usuario
    )

    if sucursal_id is not None:
        query = query.filter(MovimientoInventario.sucursal_id == sucursal_id)

    if variante_id is not None:
        query = query.filter(MovimientoInventario.variante_id == variante_id)

    if tipo is not None:
        query = query.filter(MovimientoInventario.tipo == tipo.upper())

    if fecha_desde is not None:
        query = query.filter(MovimientoInventario.fecha >= fecha_desde)

    if fecha_hasta is not None:
        query = query.filter(MovimientoInventario.fecha <= fecha_hasta)

    movimientos = query.order_by(MovimientoInventario.fecha.desc()).all()
    return movimientos
