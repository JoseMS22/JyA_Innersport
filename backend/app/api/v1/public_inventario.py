# app/api/v1/public_inventario.py

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.inventario import Inventario
from pydantic import BaseModel


class InventarioPublicRead(BaseModel):
    sucursal_id: int
    sucursal_nombre: str
    cantidad: int

    class Config:
        orm_mode = True


router = APIRouter()


@router.get("/public/inventario", response_model=List[InventarioPublicRead])
def listar_inventario_publico(
    variante_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """
    Endpoint público para ver inventario por sucursal.
    Sin permisos de usuario.
    """
    registros = (
        db.query(Inventario)
        .options(joinedload(Inventario.sucursal))
        .filter(Inventario.variante_id == variante_id)
        .all()
    )

    return [
        InventarioPublicRead(
            sucursal_id=inv.sucursal_id,
            sucursal_nombre=inv.sucursal.nombre if inv.sucursal else "Sucursal",
            cantidad=inv.cantidad,
        )
        for inv in registros
    ]
