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
from app.models.sucursal import Sucursal
from app.models.inventario import Inventario
from app.models.usuario import Usuario

from app.schemas.pedido import (
    PedidoCreateFromCart,
    PedidoItemResumen,
    PedidoRead,
    PedidoEstadoResponse,
)

from app.core.email import send_pedido_estado_email


ALLOWED_PEDIDO_ESTADOS = {
    "PAGADO",
    "EN_PREPARACION",
    "ENVIADO",
    "ENTREGADO",
    "CANCELADO",
}


def elegir_sucursal_para_pedido(
    db: Session,
    direccion: Direccion,
    items_carrito: list[CarritoItem],
) -> Sucursal | None:
    """
    Lógica de asignación de sucursal:

    1. Buscar sucursales activas en la misma provincia de la dirección de envío.
    2. Si hay varias:
       - Elegir la que pueda cubrir TODO el pedido (stock >= cantidad por variante).
       - Entre esas, escoger la que tenga mayor stock total (como “score”).
    3. Si no hay sucursales en esa provincia:
       - Usar todas las sucursales activas como fallback con la misma lógica.
    """

    provincia_envio = getattr(direccion, "provincia", None)

    # Base: solo sucursales activas y con provincia no nula
    query_suc = (
        db.query(Sucursal)
        .filter(Sucursal.activo.is_(True))
        .filter(Sucursal.provincia.isnot(None))
    )

    # 1) Intentar primero en misma provincia
    if provincia_envio:
        candidatos = (
            query_suc
            .filter(Sucursal.provincia == provincia_envio)
            .all()
        )
    else:
        candidatos = []

    # 2) Si no hay en la misma provincia, usamos todas las activas como fallback
    if not candidatos:
        candidatos = query_suc.all()

    if not candidatos:
        print("[ASIGNACIÓN SUCURSAL] No hay sucursales activas.")
        return None

    mejor_sucursal: Sucursal | None = None
    mejor_score = -1

    for suc in candidatos:
        puede_atender_todo = True
        score_total_stock = 0

        for item in items_carrito:
            inv = (
                db.query(Inventario)
                .filter(
                    Inventario.sucursal_id == suc.id,
                    Inventario.variante_id == item.variante_id,
                )
                .first()
            )

            # si no hay inventario o la cantidad es menor a lo que pide el carrito, esta sucursal no sirve
            if not inv or inv.cantidad < item.cantidad:
                puede_atender_todo = False
                break

            # sumamos stock disponible como "score"
            score_total_stock += inv.cantidad

        if not puede_atender_todo:
            continue

        if score_total_stock > mejor_score:
            mejor_score = score_total_stock
            mejor_sucursal = suc

    if not mejor_sucursal:
        print(
            "[ASIGNACIÓN SUCURSAL] Ninguna sucursal tiene stock suficiente para todos los ítems."
        )
        return None

    return mejor_sucursal


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

    # 4) Elegir sucursal (puede devolver None)
    sucursal = elegir_sucursal_para_pedido(
        db=db,
        direccion=direccion,
        items_carrito=carrito.items,
    )

    if not sucursal:
        # Regla de negocio: de momento levantamos error si ninguna sucursal puede atender
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay sucursal con stock suficiente para atender el pedido.",
        )

    # 5) Calcular costo de envío según método seleccionado
    metodos_envio = {
        "Envío Estándar": Decimal("3700.00"),    # 5-7 días hábiles
        "Envío Express": Decimal("5800.00"),     # 2-3 días hábiles
        "Envío Mismo Día": Decimal("8000.00"),   # Mismo día (solo GAM)
    }

    # Obtener método de envío desde data o usar estándar por defecto
    metodo_seleccionado = getattr(data, "metodo_envio", "Envío Estándar")
    costo_envio = metodos_envio.get(metodo_seleccionado, Decimal("3700.00"))
    metodo_envio = metodo_seleccionado

    # 6) Calcular descuento por puntos (si aplica en el futuro)
    descuento_puntos = Decimal("0.00")
    # TODO: Implementar lógica de puntos si data.usar_puntos

    # 7) Calcular puntos ganados (1 punto por cada ₡100)
    puntos_ganados = int(subtotal / 100)

    # 8) Calcular total
    total = subtotal + costo_envio - descuento_puntos

    # 9) Crear Pedido (con sucursal, envío, puntos, etc.)
    timestamp = int(time.time() * 1000)
    pedido = Pedido(
        cliente_id=usuario_id,
        direccion_envio_id=direccion.id,
        subtotal=subtotal,                  # ✅ Subtotal sin envío
        costo_envio=costo_envio,            # ✅ Costo de envío calculado
        descuento_puntos=descuento_puntos,  # ✅ Descuentos
        total=total,                        # ✅ Total con envío
        puntos_ganados=puntos_ganados,      # ✅ Puntos ganados
        estado="PAGADO",
        metodo_envio=metodo_envio,          # ✅ Método seleccionado
        numero_pedido=f"ORD-{usuario_id}-{timestamp}",
        sucursal_id=sucursal.id,            # ✅ Sucursal asignada
    )
    db.add(pedido)
    db.flush()  # para obtener pedido.id

    # 10) Crear PedidoItems en la base de datos
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

    # 11) Crear Pago simulado
    pago = Pago(
        pedido_id=pedido.id,
        monto=total,
        referencia=f"SIM-{pedido.id}",
        metodo=data.metodo_pago,
        estado="APROBADO",
    )
    db.add(pago)

    # 12) Marcar carrito como cerrado
    carrito.estado = "COMPLETADO"

    db.commit()
    db.refresh(pedido)
    db.refresh(pago)

    # 13) Enviar correo de confirmación de pedido (estado PAGADO)
    try:
        cliente = pedido.cliente
        to_email = getattr(cliente, "correo", None) or getattr(cliente, "email", None)

        if to_email:
            send_pedido_estado_email(
                to_email=to_email,
                pedido_id=pedido.id,
                nuevo_estado=pedido.estado,
            )
        else:
            print(
                f"[WARN] Pedido {pedido.id}: no se pudo obtener correo del cliente para enviar notificación."
            )

    except Exception as e:
        print(f"Error enviando correo de pedido {pedido.id}: {e}")

    # 14) Construir respuesta
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


def actualizar_estado_pedido(
    db: Session,
    pedido_id: int,
    nuevo_estado: str,
    usuario_actual: Usuario,
) -> PedidoEstadoResponse:
    """
    Cambia el estado de un pedido y envía un correo al cliente.
    """

    # 1) Validar estado permitido
    if nuevo_estado not in ALLOWED_PEDIDO_ESTADOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado de pedido no permitido.",
        )

    # 2) Buscar pedido
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado.",
        )

    estado_anterior = pedido.estado

    if estado_anterior == nuevo_estado:
        return PedidoEstadoResponse.model_validate(pedido)

    # 3) Actualizar estado
    pedido.estado = nuevo_estado

    db.commit()
    db.refresh(pedido)

    # 4) Enviar correo al cliente (si existe correo)
    if pedido.cliente and getattr(pedido.cliente, "correo", None):
        try:
            send_pedido_estado_email(
                to_email=pedido.cliente.correo,
                pedido_id=pedido.id,
                nuevo_estado=nuevo_estado,
            )
        except Exception as e:
            print(f"[PEDIDO] Error enviando correo de estado: {e}")

    return PedidoEstadoResponse.model_validate(pedido)
