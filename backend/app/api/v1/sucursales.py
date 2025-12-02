# app/api/v1/sucursales.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.sucursal import Sucursal
from app.schemas.sucursal import (
    SucursalCreate,
    SucursalUpdate,
    SucursalRead,
)

from app.core.security import get_current_admin_user
from app.models.usuario import Usuario

router = APIRouter()


@router.get("/", response_model=List[SucursalRead])
def listar_sucursales(
    solo_activas: bool = Query(False, description="Si es true, solo sucursales activas"),
    db: Session = Depends(get_db),
):
    query = db.query(Sucursal)
    if solo_activas:
        query = query.filter(Sucursal.activo.is_(True))
    return query.order_by(Sucursal.nombre.asc()).all()


@router.post("/", response_model=SucursalRead, status_code=status.HTTP_201_CREATED)
def crear_sucursal(
    data: SucursalCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    existente = db.query(Sucursal).filter(Sucursal.nombre == data.nombre).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una sucursal con ese nombre.",
        )

    sucursal = Sucursal(
        nombre=data.nombre,
        direccion=data.direccion,
        telefono=data.telefono,
        provincia=data.provincia,
    )
    db.add(sucursal)
    db.commit()
    db.refresh(sucursal)
    return sucursal


@router.get("/{sucursal_id}", response_model=SucursalRead)
def obtener_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
):
    sucursal = db.query(Sucursal).get(sucursal_id)
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada.",
        )
    return sucursal


@router.put("/{sucursal_id}", response_model=SucursalRead)
def actualizar_sucursal(
    sucursal_id: int,
    data: SucursalUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    sucursal = db.query(Sucursal).get(sucursal_id)
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada.",
        )

    if data.nombre is not None and data.nombre != sucursal.nombre:
        existente = (
            db.query(Sucursal)
            .filter(Sucursal.nombre == data.nombre, Sucursal.id != sucursal_id)
            .first()
        )
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra sucursal con ese nombre.",
            )
        sucursal.nombre = data.nombre

    if data.direccion is not None:
        sucursal.direccion = data.direccion

    if data.telefono is not None:
        sucursal.telefono = data.telefono

    # PUT actualizar_sucursal
    if data.provincia is not None:
        sucursal.provincia = data.provincia


    if data.activo is not None:
        sucursal.activo = data.activo

    db.commit()
    db.refresh(sucursal)
    return sucursal


@router.patch("/{sucursal_id}/desactivar", response_model=SucursalRead)
def desactivar_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    sucursal = db.query(Sucursal).get(sucursal_id)
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada.",
        )

    sucursal.activo = False
    db.commit()
    db.refresh(sucursal)
    return sucursal

@router.patch("/{sucursal_id}/activar", response_model=SucursalRead)
def activar_sucursal(
    sucursal_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_admin_user),
):
    sucursal = db.query(Sucursal).get(sucursal_id)
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada.",
        )

    sucursal.activo = True
    db.commit()
    db.refresh(sucursal)
    return sucursal
