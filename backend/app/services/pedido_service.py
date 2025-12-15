# backend/app/services/pedido_service.py
from decimal import Decimal, ROUND_HALF_UP
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
from app.services.programa_puntos_service import obtener_config_activa, calcular_limite_redencion

from app.schemas.pedido import (
    PedidoCreateFromCart,
    PedidoItemResumen,
    PedidoRead,
    PedidoEstadoResponse,
)

from app.core.email import send_pedido_estado_email
from collections import defaultdict

ALLOWED_PEDIDO_ESTADOS = {
    "VERIFICAR_PAGO",
    "PAGADO",
    "EN_PREPARACION",
    "ENVIADO",
    "ENTREGADO",
    "CANCELADO",
}

IVA_RATE = Decimal("0.13")

def calcular_impuesto_incluido_en_precio(monto_con_iva: Decimal) -> Decimal:
    """
    Calcula cuánto del monto corresponde a impuesto,
    asumiendo que el precio YA incluye IVA.
    """
    if monto_con_iva <= 0:
        return Decimal("0.00")

    base = monto_con_iva / (Decimal("1.00") + IVA_RATE)
    impuesto = monto_con_iva - base
    # Redondeamos a 2 decimales
    return impuesto.quantize(Decimal("0.01"))

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


def obtener_sucursales_candidatas(db: Session, direccion: Direccion) -> list[Sucursal]:
    """
    Devuelve TODAS las sucursales activas.
    (Se elimina la lógica por provincia)
    """
    sucursales = (
        db.query(Sucursal)
        .filter(Sucursal.activo.is_(True))
        .all()
    )

    if not sucursales:
        print("[ASIGNACIÓN SUCURSAL] No hay sucursales activas.")
    return sucursales




def asignar_items_a_sucursales(
    db: Session,
    sucursales: list[Sucursal],
    items_carrito: list[CarritoItem],
) -> dict[int, list[tuple[CarritoItem, int]]]:
    """
    Reparte la cantidad de cada item del carrito entre varias sucursales.

    - Si la suma del stock en todas las sucursales no alcanza para algún item,
      lanza HTTP 400.
    - Rebaja el inventario EN MEMORIA (en la sesión) con with_for_update(),
      el commit se hace al final en crear_pedido_desde_carrito.
    """

    # sucursal_id -> lista de (item_carrito, cantidad_asignada)
    asignacion: dict[int, list[tuple[CarritoItem, int]]] = defaultdict(list)

    if not sucursales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay sucursales disponibles para atender el pedido.",
        )

    # Opcional: ordenar sucursales por id o algún criterio
    sucursales_ordenadas = sorted(sucursales, key=lambda s: s.id)

    for item in items_carrito:
        cantidad_restante = item.cantidad

        for suc in sucursales_ordenadas:
            # Bloqueamos fila de inventario para evitar sobreventa en concurrencia
            inv = (
                db.query(Inventario)
                .with_for_update()
                .filter(
                    Inventario.sucursal_id == suc.id,
                    Inventario.variante_id == item.variante_id,
                )
                .first()
            )

            if not inv or inv.cantidad <= 0:
                continue

            # Tomamos lo que podamos hasta cubrir la cantidad del item
            tomar = min(inv.cantidad, cantidad_restante)
            if tomar <= 0:
                continue

            # Asignamos esa parte a esta sucursal
            asignacion[suc.id].append((item, tomar))

            # Rebajamos inventario EN esa sucursal
            inv.cantidad -= tomar

            cantidad_restante -= tomar
            if cantidad_restante == 0:
                break

        if cantidad_restante > 0:
            # No hay stock total suficiente sumando todas las sucursales
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay stock suficiente para uno de los productos del carrito.",
            )

    return asignacion


def asignar_items_a_sucursales_sin_partir(
    db,
    sucursales,
    items_carrito,
) -> dict[int, list[tuple]]:
    """
    Asigna CADA item del carrito completo a UNA sucursal.
    - No divide cantidades.
    - Si ninguna sucursal tiene stock suficiente para un item, lanza 400.
    - Rebaja inventario en la sesión (con with_for_update).
    """
    asignacion = defaultdict(list)

    if not sucursales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay sucursales disponibles para atender el pedido.",
        )

    # Puedes ordenar por prioridad (ej: misma provincia primero ya viene así)
    sucursales_ordenadas = sorted(sucursales, key=lambda s: s.id)

    for item in items_carrito:
        asignado = False

        for suc in sucursales_ordenadas:
            inv = (
                db.query(Inventario)
                .with_for_update()
                .filter(
                    Inventario.sucursal_id == suc.id,
                    Inventario.variante_id == item.variante_id,
                )
                .first()
            )

            # Importante: aquí exigimos que una sola sucursal cubra todo el item
            if inv and inv.cantidad >= item.cantidad:
                asignacion[suc.id].append((item, item.cantidad))
                inv.cantidad -= item.cantidad
                asignado = True
                break

        if not asignado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No hay stock suficiente para la variante {item.variante_id}.",
            )

    return asignacion


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

    # 3) Calcular subtotal total (carrito completo) solo para puntos/envío
    subtotal_total = Decimal("0")
    for item in carrito.items:
        subtotal_total += item.precio_unitario * item.cantidad

    # 4) Obtener sucursales candidatas (misma provincia primero, si no hay entonces todas)
    sucursales = obtener_sucursales_candidatas(db, direccion)

    # 5) Asignar cada item completo a una sucursal con stock (sin partir cantidades)
    asignacion = asignar_items_a_sucursales_sin_partir(db, sucursales, carrito.items)


    # asignacion: sucursal_id -> [(item_carrito, cantidad_asignada), ...]

    # 6) Costo de envío según método seleccionado (solo se cobrará en el primer pedido)
    metodos_envio = {
        "Envío Estándar": Decimal("3700.00"),
        "Envío Express": Decimal("5800.00"),
        "Envío Mismo Día": Decimal("8000.00"),
    }

    metodo_seleccionado = data.metodo_envio or "Envío Estándar"
    costo_envio_total = metodos_envio.get(metodo_seleccionado, Decimal("3700.00"))
    metodo_envio = metodo_seleccionado

    puntos_a_usar = int(getattr(data, "puntos_a_usar", 0) or 0)
    if puntos_a_usar < 0:
        puntos_a_usar = 0

    config = obtener_config_activa(db)
    valor_por_punto = Decimal(config.valor_colon_por_punto or 0)

    # Total bruto para validar límites (productos + envío una vez)
    total_bruto = subtotal_total + costo_envio_total

    descuento_puntos_total = Decimal("0.00")
    if puntos_a_usar > 0 and config.activo and valor_por_punto > 0:
        limite = calcular_limite_redencion(
            db,
            usuario_id=usuario_id,
            total_compra_colones=total_bruto,
        )

        if limite["puede_usar_puntos"]:
            descuento_solicitado = (Decimal(puntos_a_usar) * valor_por_punto).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            descuento_puntos_total = min(descuento_solicitado, limite["descuento_maximo_colones"])

            # Ajustar puntos_a_usar a lo que realmente se aplicó
            puntos_a_usar = int(
                (descuento_puntos_total / valor_por_punto).to_integral_value(rounding="ROUND_FLOOR")
            )


    if puntos_a_usar < 0:
        puntos_a_usar = 0

    # si quieres que el descuento NO exceda el subtotal_total (recomendado)
    if descuento_puntos_total > subtotal_total:
        descuento_puntos_total = subtotal_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        puntos_a_usar = int((descuento_puntos_total * Decimal("100")).to_integral_value(rounding=ROUND_HALF_UP))

  # TODO: lógica de puntos futura
    puntos_ganados_total = int(subtotal_total / 100)

    # 7) Crear uno o varios pedidos (uno por sucursal)
    pedidos_creados: list[Pedido] = []
    pagos_creados: list[Pago] = []
    items_resumen_totales: list[PedidoItemResumen] = []

    # Para repartir puntos ganados entre pedidos (proporcional al subtotal)
    # y el costo de envío solo en el primero
    sucursal_ids = list(asignacion.keys())
    envio_restante = costo_envio_total

    for idx, suc_id in enumerate(sucursal_ids):
        items_asignados = asignacion[suc_id]

        # Subtotal de este pedido (solo los items asignados a esta sucursal)
        subtotal_pedido = Decimal("0")
        for item, cantidad_asignada in items_asignados:
            subtotal_pedido += item.precio_unitario * cantidad_asignada

        # ✅ Repartir el descuento por puntos proporcional al subtotal de cada pedido
        if subtotal_total > 0:
            descuento_puntos_pedido = (subtotal_pedido / subtotal_total) * descuento_puntos_total
        else:
            descuento_puntos_pedido = Decimal("0.00")

        descuento_puntos_pedido = descuento_puntos_pedido.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Evitar que por redondeo se pase del subtotal del pedido
        if descuento_puntos_pedido > subtotal_pedido:
            descuento_puntos_pedido = subtotal_pedido.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


        # Puntos ganados proporcionales a este subtotal
        if subtotal_total > 0:
            puntos_ganados_pedido = int(
                (subtotal_pedido / subtotal_total) * puntos_ganados_total
            )
        else:
            puntos_ganados_pedido = 0

        # Costo de envío: solo se cobra en el primer pedido
        if idx == 0:
            costo_envio_pedido = envio_restante
        else:
            costo_envio_pedido = Decimal("0.00")

        total_pedido = subtotal_pedido + costo_envio_pedido - descuento_puntos_pedido

        timestamp = int(time.time() * 1000)

        estado = "VERIFICAR_PAGO" if data.metodo_pago == "SINPE" else "PAGADO"

        pedido = Pedido(
            cliente_id=usuario_id,
            direccion_envio_id=direccion.id,
            sucursal_id=suc_id,
            subtotal=subtotal_pedido,
            costo_envio=costo_envio_pedido,
            descuento_puntos=descuento_puntos_pedido,
            total=total_pedido,
            puntos_ganados=puntos_ganados_pedido,
            estado=estado,
            metodo_envio=metodo_envio,
            numero_pedido=f"ORD-{usuario_id}-{timestamp}-{suc_id}",
        )
        db.add(pedido)
        db.flush()  # obtener id

                # Crear PedidoItems para esta sucursal
        for item, cantidad_asignada in items_asignados:
            subtotal_item = item.precio_unitario * cantidad_asignada

            # 🆕 Calcular impuesto del ítem (precio YA incluye IVA)
            impuesto_item = calcular_impuesto_incluido_en_precio(subtotal_item)

            pedido_item = PedidoItem(
                pedido_id=pedido.id,
                variante_id=item.variante_id,
                producto_id=item.variante.producto_id,
                cantidad=cantidad_asignada,
                precio_unitario=item.precio_unitario,
                subtotal=subtotal_item,
                impuesto=impuesto_item,  # 🆕
            )
            db.add(pedido_item)

            items_resumen_totales.append(
                PedidoItemResumen(
                    variante_id=item.variante_id,
                    producto_id=item.variante.producto_id,
                    nombre_producto=item.variante.producto.nombre,
                    cantidad=cantidad_asignada,
                    precio_unitario=item.precio_unitario,
                    subtotal=subtotal_item,
                    impuesto=impuesto_item,  # 🆕
                )
            )


        pago_estado = "PENDIENTE" if data.metodo_pago == "SINPE" else "APROBADO"
        # Crear pago simulado para este pedido
        pago = Pago(
            pedido_id=pedido.id,
            monto=total_pedido,
            referencia=f"SIM-{pedido.id}",
            metodo=data.metodo_pago,
            estado=pago_estado,
        )
        db.add(pago)

        pedidos_creados.append(pedido)
        pagos_creados.append(pago)

    # 8) Marcar carrito como cerrado
    carrito.estado = "COMPLETADO"

    # 9) Commit de todo (pedidos, inventario, pagos)
    db.commit()

    # 10) Refrescar principal (primer pedido) y su pago
    pedido_principal = pedidos_creados[0]
    pago_principal = pagos_creados[0]

    db.refresh(pedido_principal)
    db.refresh(pago_principal)

    # 11) Enviar correo SOLO del pedido principal (o podrías enviar por cada uno)
    try:
        cliente = pedido_principal.cliente
        to_email = getattr(cliente, "correo", None) or getattr(cliente, "email", None)

        if to_email:
            send_pedido_estado_email(
                to_email=to_email,
                pedido_id=pedido_principal.id,
                nuevo_estado=pedido_principal.estado,
            )
        else:
            print(
                f"[WARN] Pedido {pedido_principal.id}: no se pudo obtener correo del cliente para enviar notificación."
            )
    except Exception as e:
        print(f"Error enviando correo de pedido {pedido_principal.id}: {e}")

    # 12) Construir respuesta con el pedido principal (los demás quedan en BD)
    return PedidoRead(
        id=pedido_principal.id,
        cliente_id=pedido_principal.cliente_id,
        direccion_envio_id=pedido_principal.direccion_envio_id,
        sucursal_id=pedido_principal.sucursal_id,
        subtotal=pedido_principal.subtotal,
        costo_envio=pedido_principal.costo_envio,
        descuento_puntos=pedido_principal.descuento_puntos,
        total=pedido_principal.total,
        estado=pedido_principal.estado,
        fecha_creacion=pedido_principal.fecha_creacion,
        cancelado=pedido_principal.cancelado,
        motivo_cancelacion=pedido_principal.motivo_cancelacion,
        fecha_cancelacion=pedido_principal.fecha_cancelacion,
        metodo_envio=pedido_principal.metodo_envio,
        numero_pedido=pedido_principal.numero_pedido,
        items=items_resumen_totales,
        pago_estado=pago_principal.estado,
        pago_metodo=pago_principal.metodo,
        pago_referencia=pago_principal.referencia,
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

    if usuario_actual.rol != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden cambiar el estado del pedido.",
        )

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

