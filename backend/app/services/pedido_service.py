# backend/app/services/pedido_service.py
from decimal import Decimal
from typing import List
import time

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.carrito import Carrito, CarritoItem
from app.models.pedido import Pedido
from app.models.pedido_item import PedidoItem
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

    # 3) Calcular subtotal
    subtotal = Decimal("0")
    items_resumen: List[PedidoItemResumen] = []

    for item in carrito.items:
        subtotal_item = item.precio_unitario * item.cantidad
        subtotal += subtotal_item

        items_resumen.append(
            PedidoItemResumen(
                variante_id=item.variante_id,
                producto_id=item.variante.producto_id,
                nombre_producto=item.variante.producto.nombre,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=subtotal_item,
            )
        )

    # 🆕 4) Calcular costo de envío según método seleccionado
    metodos_envio = {
        'Envío Estándar': Decimal('3700.00'),    # 5-7 días hábiles
        'Envío Express': Decimal('5800.00'),      # 2-3 días hábiles
        'Envío Mismo Día': Decimal('8000.00'),   # Mismo día (solo GAM)
    }
    
    # Obtener método de envío desde data o usar estándar por defecto
    metodo_seleccionado = getattr(data, 'metodo_envio', 'Envío Estándar')
    costo_envio = metodos_envio.get(metodo_seleccionado, Decimal('3700.00'))
    metodo_envio = metodo_seleccionado

    # 5) Calcular descuento por puntos (si aplica en el futuro)
    descuento_puntos = Decimal("0.00")
    # TODO: Implementar lógica de puntos si data.usar_puntos

    # 6) Calcular puntos ganados (1 punto por cada ₡100)
    puntos_ganados = int(subtotal / 100)

    # 7) Calcular total
    total = subtotal + costo_envio - descuento_puntos

    # 8) Crear Pedido
    timestamp = int(time.time() * 1000)
    pedido = Pedido(
        cliente_id=usuario_id,
        direccion_envio_id=direccion.id,
        subtotal=subtotal,               # ✅ Subtotal sin envío
        costo_envio=costo_envio,         # ✅ Costo de envío calculado
        descuento_puntos=descuento_puntos,  # ✅ Descuentos
        total=total,                     # ✅ Total con envío
        puntos_ganados=puntos_ganados,   # ✅ Puntos ganados
        estado="PAGADO",
        metodo_envio=metodo_envio,       # ✅ Método seleccionado
        numero_pedido=f"ORD-{usuario_id}-{timestamp}"
    )
    db.add(pedido)
    db.flush()  # para obtener pedido.id

    # 9) Crear PedidoItems en la base de datos
    for item in carrito.items:
        subtotal_item = item.precio_unitario * item.cantidad
        pedido_item = PedidoItem(
            pedido_id=pedido.id,
            variante_id=item.variante_id,
            producto_id=item.variante.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=subtotal_item,
        )
        db.add(pedido_item)

    # 10) Crear Pago simulado
    pago = Pago(
        pedido_id=pedido.id,
        monto=total,
        referencia=f"SIM-{pedido.id}",
        metodo=data.metodo_pago,
        estado="APROBADO",
    )
    db.add(pago)

    # 11) Marcar carrito como cerrado
    carrito.estado = "COMPLETADO"

    db.commit()
    db.refresh(pedido)
    db.refresh(pago)

    # 12) Construir respuesta
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