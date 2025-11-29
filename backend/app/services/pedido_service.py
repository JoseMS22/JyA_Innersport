# backend/app/services/pedido_service.py
from decimal import Decimal
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.carrito import Carrito, CarritoItem
from app.models.pedido import Pedido
from app.models.pago import Pago
from app.models.direccion import Direccion
from app.schemas.pedido import (
    PedidoCreateFromCart,
    PedidoItemResumen,
    PedidoRead,
)


def crear_pedido_desde_carrito(
    db: Session,
    usuario_id: int,
    data: PedidoCreateFromCart,
) -> PedidoRead:
    # 1) Obtener carrito abierto del usuario
    carrito = (
        db.query(Carrito)
        .options(joinedload(Carrito.items).joinedload(CarritoItem.variante))
        .filter(
            Carrito.usuario_id == usuario_id,
            Carrito.estado == "ABIERTO",
        )
        .first()
    )

    if not carrito or not carrito.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu carrito está vacío.",
        )

    # 2) Verificar dirección pertenece al usuario y está activa
    direccion = (
        db.query(Direccion)
        .filter(
            Direccion.id == data.direccion_envio_id,
            Direccion.usuario_id == usuario_id,
            Direccion.activa.is_(True),
        )
        .first()
    )
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La dirección seleccionada no es válida.",
        )

    # 3) Calcular total
    total = Decimal("0")
    items_resumen: List[PedidoItemResumen] = []

    for item in carrito.items:
        subtotal = item.precio_unitario * item.cantidad
        total += subtotal

        items_resumen.append(
            PedidoItemResumen(
                variante_id=item.variante_id,
                producto_id=item.variante.producto_id,
                nombre_producto=item.variante.producto.nombre,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=subtotal,
            )
        )

    # 4) Crear Pedido
    pedido = Pedido(
        cliente_id=usuario_id,
        direccion_envio_id=direccion.id,
        total=total,
        estado="PAGADO",  # por ahora pagado directamente
    )
    db.add(pedido)
    db.flush()  # para obtener pedido.id

    # 5) Crear Pago simulado
    pago = Pago(
        pedido_id=pedido.id,
        monto=total,
        referencia=f"SIM-{pedido.id}",
        metodo=data.metodo_pago,
        estado="APROBADO",
    )
    db.add(pago)

    # 6) Marcar carrito como cerrado
    carrito.estado = "COMPLETADO"

    db.commit()
    db.refresh(pedido)
    db.refresh(pago)

    # 7) Construir respuesta
    return PedidoRead(
        id=pedido.id,
        cliente_id=pedido.cliente_id,
        direccion_envio_id=pedido.direccion_envio_id,
        total=pedido.total,
        estado=pedido.estado,
        fecha_creacion=pedido.fecha_creacion,
        items=items_resumen,
        pago_estado=pago.estado,
        pago_metodo=pago.metodo,
        pago_referencia=pago.referencia,
    )