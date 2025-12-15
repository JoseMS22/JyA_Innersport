# backend/app/api/v1/checkout.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.checkout import CheckoutSummary, CheckoutApplyPoints
from app.services import carrito_service, puntos_service, checkout_service

router = APIRouter()

@router.get("/", response_model=CheckoutSummary)
def obtener_resumen_checkout(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene: carrito, dirección predeterminada, saldo puntos, totales"""
    return checkout_service.obtener_resumen(db, current_user.id)


@router.post("/aplicar-puntos", response_model=CheckoutSummary)
def aplicar_puntos(
    data: CheckoutApplyPoints,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Aplica puntos al total del checkout"""
    return checkout_service.aplicar_puntos(db, current_user.id, data.cantidad)


@router.post("/confirmar")
def confirmar_checkout(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Simula el pago → restar puntos usados y generar registro"""
    checkout_service.confirmar(db, current_user.id)
    return {"mensaje": "Compra realizada con éxito"}