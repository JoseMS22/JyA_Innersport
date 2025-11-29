# backend/app/services/checkout_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services import carrito_service, puntos_service, direccion_service


def obtener_resumen(db: Session, user_id: int):
    carrito = carrito_service.obtener_carrito_usuario(db, user_id)
    if not carrito or not carrito.items:
        raise HTTPException(400, "Tu carrito está vacío")

    subtotal = carrito_service.calcular_subtotal(carrito)

    # puntos
    saldo = puntos_service.obtener_saldo(db, user_id)
    puntos_disponibles = saldo.puntos if saldo else 0

    direccion = direccion_service.obtener_direccion_predeterminada(db, user_id)

    return {
        "subtotal": subtotal,
        "descuento_puntos": 0,
        "total": subtotal,
        "puntos_usados": 0,
        "puntos_disponibles": puntos_disponibles,
        "direccion_predeterminada": direccion.__dict__ if direccion else None,
        "items": [item.to_dict() for item in carrito.items],
    }


def aplicar_puntos(db: Session, user_id: int, puntos: int):
    saldo = puntos_service.obtener_saldo(db, user_id)
    if not saldo or saldo.puntos < puntos:
        raise HTTPException(400, "No tienes suficientes puntos")

    carrito = carrito_service.obtener_carrito_usuario(db, user_id)
    subtotal = carrito_service.calcular_subtotal(carrito)

    descuento = puntos / 100.0  # 100 pts = ₡1

    if descuento > subtotal:
        descuento = subtotal
        puntos = int(subtotal * 100)

    total = subtotal - descuento

    return {
        "subtotal": subtotal,
        "descuento_puntos": float(descuento),
        "total": float(total),
        "puntos_usados": puntos,
        "puntos_disponibles": saldo.puntos,
        "direccion_predeterminada": direccion_service.obtener_direccion_predeterminada(db, user_id).__dict__,
        "items": [item.to_dict() for item in carrito.items],
    }


def confirmar(db: Session, user_id: int):
    saldo = puntos_service.obtener_saldo(db, user_id)
    if not saldo:
        return

    # 🟧 Restar puntos usados
    puntos_usados = saldo.puntos_usados_temporal
    saldo.puntos -= puntos_usados
    saldo.puntos_usados_temporal = 0

    db.commit()