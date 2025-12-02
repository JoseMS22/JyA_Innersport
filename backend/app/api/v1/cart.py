# app/api/v1/cart.py
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.carrito import Carrito, CarritoItem
from app.models.variante import Variante
from app.models.producto import Producto
from app.models.media import Media
from app.schemas.cart import (
    CartItemFromApi,
    CartResponse,
    CartItemCreate,
    CartItemUpdate,
)
from app.schemas.programa_puntos import LimiteRedencionOut
from app.services.programa_puntos_service import calcular_limite_redencion

router = APIRouter(prefix="/cart", tags=["Carrito"])


def _get_or_create_open_cart(db: Session, user: Usuario) -> Carrito:
    carrito = (
        db.query(Carrito)
        .filter(
            Carrito.usuario_id == user.id,
            Carrito.estado == "ABIERTO",
        )
        .options(joinedload(Carrito.items).joinedload(CarritoItem.variante))
        .first()
    )

    if carrito:
        return carrito

    carrito = Carrito(usuario_id=user.id, estado="ABIERTO")
    db.add(carrito)
    db.commit()
    db.refresh(carrito)
    return carrito


def _build_cart_item_from_model(item: CarritoItem) -> CartItemFromApi:
    variante: Variante = item.variante
    producto: Producto = variante.producto

    # imagen principal (primer Media por orden, tipo IMAGEN)
    principal: Optional[Media] = None
    if producto.media:
        principal = sorted(producto.media, key=lambda m: m.orden)[0]

    imagen_url = principal.url if principal else None

    precio_unitario = Decimal(item.precio_unitario)
    subtotal = precio_unitario * item.cantidad

    return CartItemFromApi(
        variante_id=variante.id,
        producto_id=producto.id,
        nombre_producto=producto.nombre,
        marca=variante.marca,
        sku=variante.sku,
        color=variante.color,
        talla=variante.talla,
        cantidad=item.cantidad,
        precio_unitario=precio_unitario,
        subtotal=subtotal,
        imagen_url=imagen_url,
    )


def _build_cart_response(carrito: Optional[Carrito]) -> CartResponse:
    if not carrito or not carrito.items:
        return CartResponse(items=[], total_items=0, total=Decimal("0"))

    items: List[CartItemFromApi] = []
    total = Decimal("0")
    total_items = 0

    for item in carrito.items:
        api_item = _build_cart_item_from_model(item)
        items.append(api_item)
        total += api_item.subtotal
        total_items += api_item.cantidad

    return CartResponse(items=items, total_items=total_items, total=total)


# =========================
# GET /api/v1/cart
# =========================

@router.get("", response_model=CartResponse)
def get_cart(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Devuelve el carrito ABIERTO del usuario actual.
    """
    carrito = (
        db.query(Carrito)
        .filter(
            Carrito.usuario_id == current_user.id,
            Carrito.estado == "ABIERTO",
        )
        .options(
            joinedload(Carrito.items)
            .joinedload(CarritoItem.variante)
            .joinedload(Variante.producto)
            .joinedload(Producto.media)
        )
        .first()
    )

    return _build_cart_response(carrito)


# =========================
# POST /api/v1/cart/items
# =========================

@router.post("/items", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    payload: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Agrega una variante al carrito (o incrementa cantidad si ya existe).
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

    if not variante.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta variante no está activa.",
        )

    carrito = _get_or_create_open_cart(db, current_user)

    # Buscar si ya existe un item con esa variante
    item = (
        db.query(CarritoItem)
        .filter(
            CarritoItem.carrito_id == carrito.id,
            CarritoItem.variante_id == variante.id,
        )
        .first()
    )

    if item:
        item.cantidad += payload.cantidad
    else:
        precio_unitario = variante.precio_actual or 0
        item = CarritoItem(
            carrito_id=carrito.id,
            variante_id=variante.id,
            cantidad=payload.cantidad,
            precio_unitario=precio_unitario,
        )
        db.add(item)

    db.commit()

    # recargar carrito con relaciones
    db.refresh(carrito)
    carrito = (
        db.query(Carrito)
        .filter(Carrito.id == carrito.id)
        .options(
            joinedload(Carrito.items)
            .joinedload(CarritoItem.variante)
            .joinedload(Variante.producto)
            .joinedload(Producto.media)
        )
        .first()
    )

    return _build_cart_response(carrito)


# =========================
# PATCH /api/v1/cart/items/{variante_id}
# =========================

@router.patch("/items/{variante_id}", response_model=CartResponse)
def update_cart_item(
    variante_id: int,
    payload: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Actualiza la cantidad de un item.
    Si cantidad <= 0, se elimina del carrito.
    """
    carrito = (
        db.query(Carrito)
        .filter(
            Carrito.usuario_id == current_user.id,
            Carrito.estado == "ABIERTO",
        )
        .first()
    )
    if not carrito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tienes carrito abierto.",
        )

    item = (
        db.query(CarritoItem)
        .filter(
            CarritoItem.carrito_id == carrito.id,
            CarritoItem.variante_id == variante_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El producto no está en tu carrito.",
        )

    if payload.cantidad <= 0:
        db.delete(item)
    else:
        item.cantidad = payload.cantidad

    db.commit()

    carrito = (
        db.query(Carrito)
        .filter(Carrito.id == carrito.id)
        .options(
            joinedload(Carrito.items)
            .joinedload(CarritoItem.variante)
            .joinedload(Variante.producto)
            .joinedload(Producto.media)
        )
        .first()
    )

    return _build_cart_response(carrito)


# =========================
# DELETE /api/v1/cart/items/{variante_id}
# =========================

@router.delete("/items/{variante_id}", response_model=CartResponse)
def delete_cart_item(
    variante_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Elimina un item puntual del carrito.
    """
    carrito = (
        db.query(Carrito)
        .filter(
            Carrito.usuario_id == current_user.id,
            Carrito.estado == "ABIERTO",
        )
        .first()
    )
    if not carrito:
        # devolver carrito vacío
        return _build_cart_response(None)

    item = (
        db.query(CarritoItem)
        .filter(
            CarritoItem.carrito_id == carrito.id,
            CarritoItem.variante_id == variante_id,
        )
        .first()
    )

    if item:
        db.delete(item)
        db.commit()

    carrito = (
        db.query(Carrito)
        .filter(Carrito.id == carrito.id)
        .options(
            joinedload(Carrito.items)
            .joinedload(CarritoItem.variante)
            .joinedload(Variante.producto)
            .joinedload(Producto.media)
        )
        .first()
    )

    return _build_cart_response(carrito)


# =========================
# DELETE /api/v1/cart
# =========================

@router.delete("", response_model=CartResponse)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Vacía por completo el carrito ABIERTO del usuario.
    """
    carrito = (
        db.query(Carrito)
        .filter(
            Carrito.usuario_id == current_user.id,
            Carrito.estado == "ABIERTO",
        )
        .first()
    )

    if not carrito:
        return _build_cart_response(None)

    # Borramos todos los items
    for item in list(carrito.items):
        db.delete(item)

    db.commit()

    # Devolvemos carrito vacío
    return _build_cart_response(None)

@router.get("/me/puntos/limite", response_model=LimiteRedencionOut)
def get_cart_points_limit(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Usa el TOTAL del carrito actual del usuario para calcular
    cuánto puede usar en puntos en esta compra.

    NO descuenta puntos todavía; solo informa el límite.
    """

    # 1️⃣ Obtener el carrito ABIERTO igual que en get_cart
    carrito = (
        db.query(Carrito)
        .filter(
            Carrito.usuario_id == current_user.id,
            Carrito.estado == "ABIERTO",
        )
        .options(
            joinedload(Carrito.items)
            .joinedload(CarritoItem.variante)
            .joinedload(Variante.producto)
            .joinedload(Producto.media)
        )
        .first()
    )

    # Reutilizamos el helper para tener un CartResponse con total y items
    cart_response = _build_cart_response(carrito)

    # Si el carrito está vacío, no tiene sentido usar puntos
    if not cart_response.items or cart_response.total <= 0:
        return LimiteRedencionOut(
            puede_usar_puntos=False,
            motivo="El carrito está vacío.",
            descuento_maximo_colones=Decimal("0"),
            puntos_necesarios_para_maximo=0,
            saldo_puntos=0,
        )

    total_compra = Decimal(cart_response.total)

    # 2️⃣ Calcular límite de redención usando el servicio centralizado
    data = calcular_limite_redencion(
        db,
        usuario_id=current_user.id,
        total_compra_colones=total_compra,
    )

    return LimiteRedencionOut(
        puede_usar_puntos=data["puede_usar_puntos"],
        motivo=data["motivo"],
        descuento_maximo_colones=data["descuento_maximo_colones"],
        puntos_necesarios_para_maximo=data["puntos_necesarios_para_maximo"],
        saldo_puntos=data["saldo_puntos"],
    )