from datetime import datetime, timezone
from typing import Optional, List
from decimal import Decimal
import time

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload, selectinload

from app.db import get_db
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.usuario_sucursal import UsuarioSucursal
from app.models.caja_turno import CajaTurno
from app.models.caja_movimientos import CajaMovimiento
from app.models.venta_pos import VentaPOS
from app.models.venta_pos_item import VentaPOSItem
from app.models.pago_pos import PagoPOS
from app.models.inventario import Inventario
from app.models.variante import Variante
from app.models.producto import Producto
from app.models.media import Media  # 👈 agregar
from app.models.programa_puntos import SaldoPuntosUsuario


from app.schemas.pos import (
    CajaAbrirRequest,
    CajaTurnoOut,
    CajaCerrarRequest,
    CajaCerrarResponse,
    POSVentaCreate,
    POSVentaOut,
    POSConfigOut,
    SucursalPOSOut,
    POSVentaItemOut,
    POSVentaListItemOut,
    POSVentaDetailOut,
    POSPagoPOSOut,
    POSProductoOut,
    POSVentaEstadoUpdate,
    POSVentaEstadoResponse,
    POSClienteCreate,
    POSClientePublic,
    POSClienteSearchItem,
)

from app.services.programa_puntos_service import (
    obtener_config_activa,
    calcular_limite_redencion,
    registrar_puntos_por_compra,
    registrar_movimiento_puntos,
)

from app.services.usuario_service import create_cliente_pos
from app.services.audit_service import registrar_auditoria
from app.core.request_utils import get_client_ip
from app.services.comisiones_service import (
    obtener_configuracion_activa as obtener_configuracion_comision_activa,
)
from app.models.comision_vendedor import ComisionVendedor
from app.services.comisiones_service import crear_comision_pos_si_aplica


router = APIRouter()


@router.post(
    "/clientes",
    response_model=POSClientePublic,
    status_code=status.HTTP_201_CREATED,
)
def crear_cliente_pos_endpoint(
    payload: POSClienteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Crea un cliente desde POS (rol CLIENTE, sin dirección).
    Solo VENDEDOR o ADMIN.
    """
    if current_user.rol not in ("VENDEDOR", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear clientes desde POS.",
        )

    ip_address = get_client_ip(request)

    usuario = create_cliente_pos(db, payload)

    # Auditoría
    registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        accion="POS_CREATE_CLIENTE",
        entidad="Usuario",
        entidad_id=usuario.id,
        detalles=f"Cliente POS creado: {usuario.correo}",
        ip_address=ip_address,
    )

    return usuario


@router.get(
    "/clientes/buscar",
    response_model=list[POSClienteSearchItem],
    status_code=status.HTTP_200_OK,
)
def buscar_clientes_pos(
    correo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Busca clientes por correo (ILIKE %correo%).
    Devuelve id, nombre, correo, telefono y puntos actuales.
    Solo VENDEDOR o ADMIN.
    """
    if current_user.rol not in ("VENDEDOR", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para buscar clientes.",
        )

    query = (
        db.query(Usuario, SaldoPuntosUsuario)
        .outerjoin(SaldoPuntosUsuario, SaldoPuntosUsuario.usuario_id == Usuario.id)
        .filter(
            Usuario.rol == "CLIENTE",
            Usuario.activo == True,
            Usuario.correo.ilike(f"%{correo}%"),
        )
        .order_by(Usuario.correo.asc())
        .limit(10)
    )

    resultados: list[POSClienteSearchItem] = []

    for usuario, saldo in query.all():
        puntos = saldo.saldo if saldo is not None else 0

        resultados.append(
            POSClienteSearchItem(
                id=usuario.id,
                nombre=usuario.nombre,
                correo=usuario.correo,
                telefono=usuario.telefono,
                puntos_actuales=puntos,
            )
        )


    return resultados


# ===== Helpers / permisos =====

def require_vendedor_o_admin(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    if current_user.rol not in ("VENDEDOR", "ADMIN"):
        raise HTTPException(
            status_code=403,
            detail="Solo usuarios con rol VENDEDOR o ADMIN pueden usar el POS.",
        )
    return current_user


def get_caja_abierta(
    db: Session,
    usuario_id: int,
) -> Optional[CajaTurno]:
    return (
        db.query(CajaTurno)
        .filter(
            CajaTurno.usuario_id == usuario_id,
            CajaTurno.estado == "ABIERTA",
        )
        .one_or_none()
    )


# ===== Config inicial POS =====

@router.get("/config", response_model=POSConfigOut)
def obtener_config_pos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Config inicial del POS:
    - Usuario actual
    - Sucursales donde puede vender
    - Caja abierta (si existe)
    """
    # Sucursales asignadas al usuario
    asignaciones = (
        db.query(UsuarioSucursal)
        .join(Sucursal, UsuarioSucursal.sucursal_id == Sucursal.id)
        .filter(
            UsuarioSucursal.usuario_id == current_user.id,
            UsuarioSucursal.puede_vender.is_(True),
            Sucursal.activo.is_(True),
        )
        .all()
    )

    sucursales = [a.sucursal for a in asignaciones]

    caja_actual = get_caja_abierta(db, current_user.id)

    return POSConfigOut(
        usuario_id=current_user.id,
        nombre_usuario=current_user.nombre,
        rol=current_user.rol,
        sucursales=[SucursalPOSOut.model_validate(s) for s in sucursales],
        caja_actual=CajaTurnoOut.model_validate(caja_actual)
        if caja_actual
        else None,
    )


# ===== Caja: abrir / ver / cerrar =====

@router.post("/caja/abrir", response_model=CajaTurnoOut)
def abrir_caja(
    data: CajaAbrirRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Abre una caja para el vendedor actual.
    - No permite abrir si ya existe una caja ABIERTA para ese usuario.
    """
    caja_existente = get_caja_abierta(db, current_user.id)
    if caja_existente is not None:
        raise HTTPException(
            status_code=400,
            detail="Ya tienes una caja abierta. Debes cerrarla antes de abrir otra.",
        )

    caja = CajaTurno(
        usuario_id=current_user.id,
        monto_apertura=data.monto_apertura,
        estado="ABIERTA",
    )
    db.add(caja)
    db.commit()
    db.refresh(caja)

    return CajaTurnoOut.model_validate(caja)


@router.get("/caja/turno-actual", response_model=Optional[CajaTurnoOut])
def obtener_caja_actual(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Devuelve la caja ABIERTA del vendedor (o None).
    """
    caja = get_caja_abierta(db, current_user.id)
    if not caja:
        return None
    return CajaTurnoOut.model_validate(caja)


@router.post("/caja/cerrar", response_model=CajaCerrarResponse)
def cerrar_caja(
    data: CajaCerrarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Cierra la caja ABIERTA del vendedor, calculando:
    - monto_teorico_cierre
    - diferencia (real - teórico)
    """
    caja = get_caja_abierta(db, current_user.id)
    if caja is None:
        raise HTTPException(
            status_code=400,
            detail="No tienes caja abierta para cerrar.",
        )

    # Obtenemos todos los movimientos de esa caja
    movimientos = (
        db.query(CajaMovimiento)
        .filter(CajaMovimiento.caja_turno_id == caja.id)
        .all()
    )

    efectivo_teorico = caja.monto_apertura

    for mov in movimientos:
        if mov.tipo in ("VENTA_EFECTIVO", "INGRESO_EFECTIVO"):
            efectivo_teorico += mov.monto
        elif mov.tipo in ("DEVOLUCION_EFECTIVO", "RETIRO_EFECTIVO"):
            efectivo_teorico -= mov.monto

    caja.monto_teorico_cierre = efectivo_teorico
    caja.monto_real_cierre = data.monto_real_cierre
    caja.diferencia = data.monto_real_cierre - efectivo_teorico
    caja.estado = "CERRADA"
    caja.observaciones = data.observaciones
    caja.fecha_cierre = datetime.now(timezone.utc)

    db.add(caja)
    db.commit()
    db.refresh(caja)

    return CajaCerrarResponse.model_validate(caja)



# ============================
# PRODUCTOS PARA EL POS
# ============================

@router.get("/productos", response_model=List[POSProductoOut])
def listar_productos_pos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
    sucursal_id: int = Query(..., description="Sucursal desde la que se vende"),
    search: Optional[str] = Query(None, description="Buscar por nombre o SKU"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Lista productos disponibles para vender en una sucursal:
    - Usa Inventario para saber el stock por sucursal
    - Devuelve variante, producto, precio, sku, stock e imagen
    """

    # Validar que el vendedor puede vender en esa sucursal (salvo ADMIN)
    if current_user.rol != "ADMIN":
        asignacion = (
            db.query(UsuarioSucursal)
            .filter(
                UsuarioSucursal.usuario_id == current_user.id,
                UsuarioSucursal.sucursal_id == sucursal_id,
                UsuarioSucursal.puede_vender.is_(True),
            )
            .first()
        )
        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para vender en esta sucursal.",
            )

    q = (
        db.query(Inventario)
        .join(Variante, Inventario.variante_id == Variante.id)
        .join(Producto, Variante.producto_id == Producto.id)
        .filter(Inventario.sucursal_id == sucursal_id)
        .filter(Inventario.cantidad > 0)
        .options(
            joinedload(Inventario.variante).joinedload(Variante.producto),
        )
        .order_by(Producto.nombre.asc())
    )

    if search:
        like = f"%{search}%"
        q = q.filter(
            (Producto.nombre.ilike(like))
            | (Variante.sku.ilike(like))
        )

    # 👈 SIEMPRE se ejecuta, haya o no search
    inventarios = q.limit(limit).all()

    resultado: List[POSProductoOut] = []

    for inv in inventarios:
        variante = inv.variante
        producto = variante.producto

        # ✅ PRECIO: usamos precio_actual de la variante
        precio = getattr(variante, "precio_actual", None)
        if precio is None:
            precio = Decimal("0")

        # ✅ IMAGEN: primera media del producto
        medias = (
            db.query(Media.url)
            .filter(Media.producto_id == producto.id)
            .order_by(Media.orden.asc(), Media.id.asc())
            .all()
        )
        imagen_url = medias[0][0] if medias else None

        resultado.append(
            POSProductoOut(
                variante_id=variante.id,
                producto_id=producto.id,
                nombre=producto.nombre,
                precio=precio,
                sku=variante.sku,
                sucursal_id=inv.sucursal_id,
                stock=inv.cantidad,
                imagen_url=imagen_url,
                color=getattr(variante, "color", None),
                talla=getattr(variante, "talla", None),
            )
        )

    return resultado




# ===== POS - Crear pedido (lo hacemos luego) =====

@router.post("/ventas", response_model=POSVentaOut)
def crear_venta_pos(
    data: POSVentaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Crea una venta POS:
    - Valida sucursal del vendedor
    - Verifica caja abierta si hay pagos en EFECTIVO
    - Cliente opcional (registrado o mostrador)
    - Permite nombre_cliente personalizado
    - Integra programa de puntos (earn + redeem) solo si hay cliente
    - Crea VentaPOS + VentaPOSItem + PagoPOS
    - Actualiza inventario por sucursal
    - Registra movimientos de caja para pagos en EFECTIVO
    """

    # 1) Debe tener items
    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La venta POS debe tener al menos un ítem.",
        )

    # 2) Validar que el vendedor puede vender en esa sucursal (salvo ADMIN)
    if current_user.rol != "ADMIN":
        asignacion = (
            db.query(UsuarioSucursal)
            .filter(
                UsuarioSucursal.usuario_id == current_user.id,
                UsuarioSucursal.sucursal_id == data.sucursal_id,
                UsuarioSucursal.puede_vender.is_(True),
            )
            .first()
        )
        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para vender en esta sucursal.",
            )

    # 3) Validar caja abierta si hay pagos en EFECTIVO
    hay_efectivo = any(p.metodo == "EFECTIVO" for p in data.pagos)
    caja: Optional[CajaTurno] = None
    if hay_efectivo:
        caja = get_caja_abierta(db, current_user.id)
        if caja is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes tener una caja ABIERTA para registrar pagos en efectivo.",
            )

    # 4) Resolver cliente y nombre_cliente
    cliente_id: Optional[int] = None
    nombre_cliente = data.nombre_cliente.strip() if data.nombre_cliente else None

    if data.cliente_id is not None:
        # Cliente registrado
        cliente = (
            db.query(Usuario)
            .filter(
                Usuario.id == data.cliente_id,
                Usuario.activo.is_(True),
            )
            .first()
        )
        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El cliente indicado no existe o está inactivo.",
            )

        cliente_id = cliente.id
        if not nombre_cliente:
            nombre_cliente = cliente.nombre

    else:
        # Sin cliente_id
        if data.usar_cliente_mostrador:
            # Venta anónima o con nombre libre
            if not nombre_cliente:
                nombre_cliente = "Anónimo"
            cliente_id = None  # venta sin usuario asociado
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes seleccionar un cliente o marcar usar_cliente_mostrador.",
            )

    # 5) Calcular subtotal y validar inventario
    subtotal = Decimal("0.00")
    items_info = []

    for item_in in data.items:
        variante = (
            db.query(Variante)
            .options(joinedload(Variante.producto))
            .filter(Variante.id == item_in.variante_id)
            .first()
        )
        if not variante:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La variante {item_in.variante_id} no existe.",
            )

        producto = variante.producto

        if producto.id != item_in.producto_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Inconsistencia: el producto_id {item_in.producto_id} "
                    f"no corresponde a la variante {item_in.variante_id}."
                ),
            )

        inv = (
            db.query(Inventario)
            .filter(
                Inventario.sucursal_id == data.sucursal_id,
                Inventario.variante_id == item_in.variante_id,
            )
            .with_for_update()
            .one_or_none()
        )

        disponible = int(inv.cantidad) if inv else 0
        if disponible < item_in.cantidad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Stock insuficiente. "
                    f"Producto: '{producto.nombre}' | SKU: {variante.sku} | "
                    f"Variante: {item_in.variante_id} | "
                    f"Disponible: {disponible} | Solicitado: {item_in.cantidad} | "
                    f"Sucursal: {data.sucursal_id}"
                ),
            )


        subtotal_item = item_in.precio_unitario * item_in.cantidad
        subtotal += subtotal_item
        items_info.append((item_in, subtotal_item, producto))

    # 6) Programa de puntos: solo si hay cliente
    config_puntos = obtener_config_activa(db)
    descuento_puntos = Decimal("0")
    puntos_redimidos = 0

    if cliente_id is None and data.puntos_a_usar > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden usar puntos en una venta sin cliente asignado.",
        )

    if (
        cliente_id is not None
        and data.puntos_a_usar > 0
        and config_puntos.activo
        and config_puntos.valor_colon_por_punto
        and config_puntos.valor_colon_por_punto > 0
    ):
        limite = calcular_limite_redencion(
            db,
            usuario_id=cliente_id,
            total_compra_colones=subtotal,
        )

        if not limite["puede_usar_puntos"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=limite["motivo"] or "No se pueden usar puntos en esta compra.",
            )

        valor_por_punto = Decimal(config_puntos.valor_colon_por_punto)
        descuento_solicitado = Decimal(data.puntos_a_usar) * valor_por_punto
        max_descuento = limite["descuento_maximo_colones"]

        descuento_aplicado = min(descuento_solicitado, max_descuento)

        if descuento_aplicado > 0:
            puntos_redimidos = int(
                (descuento_aplicado / valor_por_punto).to_integral_value(
                    rounding="ROUND_FLOOR"
                )
            )
            descuento_puntos = descuento_aplicado

            registrar_movimiento_puntos(
                db,
                usuario_id=cliente_id,
                tipo="redeem",
                puntos=puntos_redimidos,
                descripcion=f"Redención de puntos en venta POS de ₡{int(subtotal)}",
                order_id=None,
            )

        # Base imponible = subtotal - descuento
    base_imponible = subtotal - descuento_puntos
    if base_imponible < 0:
        base_imponible = Decimal("0.00")

    # IVA 13%
    IVA_13 = Decimal("0.13")
    impuesto = (base_imponible * IVA_13).quantize(Decimal("0.01"))

    total = base_imponible + impuesto


    # 7) Validar que los pagos coincidan con el total
    total_pagos = sum((p.monto for p in data.pagos), Decimal("0.00"))
    if total_pagos != total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La suma de los pagos no coincide con el total de la venta.",
        )

    # 8) Crear la VentaPOS (puntos_ganados se completa después)
    venta = VentaPOS(
        sucursal_id=data.sucursal_id,
        vendedor_id=current_user.id,
        cliente_id=cliente_id,
        nombre_cliente=nombre_cliente,
        subtotal=subtotal,
        descuento_puntos=descuento_puntos,
        impuesto=impuesto,
        total=total,
        puntos_ganados=0,
        estado="PAGADO",
    )
    db.add(venta)
    db.flush()  # para tener venta.id
    crear_comision_pos_si_aplica(db, venta)

    # 9) Crear ítems y rebajar inventario
    for item_in, subtotal_item, producto in items_info:
        item = VentaPOSItem(
            venta_pos_id=venta.id,
            variante_id=item_in.variante_id,
            producto_id=item_in.producto_id,
            cantidad=item_in.cantidad,
            precio_unitario=item_in.precio_unitario,
            subtotal=subtotal_item,
        )
        db.add(item)

        inv = (
            db.query(Inventario)
            .filter(
                Inventario.sucursal_id == data.sucursal_id,
                Inventario.variante_id == item_in.variante_id,
            )
            .with_for_update()
            .first()
        )
        if not inv or inv.cantidad < item_in.cantidad:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"No hay stock suficiente de '{producto.nombre}' "
                    f"al confirmar la venta."
                ),
            )
        inv.cantidad -= item_in.cantidad
        db.add(inv)

    # 10) Crear pagos POS y movimientos de caja
    for pago_in in data.pagos:
        pago_pos = PagoPOS(
            venta_pos_id=venta.id,
            metodo=pago_in.metodo,
            monto=pago_in.monto,
            referencia=f"POS-{venta.id}-{int(time.time())}",
            estado="APROBADO",
        )
        db.add(pago_pos)
        db.flush()

        if pago_in.metodo == "EFECTIVO" and caja:
            mov = CajaMovimiento(
                caja_turno_id=caja.id,
                sucursal_id=data.sucursal_id,
                venta_pos_id=venta.id,  # asumiendo que ya agregaste esta FK
                pedido_id=None,
                pago_id=None,  # PagoPOS no se enlaza aquí
                tipo="VENTA_EFECTIVO",
                monto=pago_in.monto,
                descripcion=f"Venta POS #{venta.id}",
            )
            db.add(mov)

    db.commit()

    # 11) Puntos ganados por la compra (solo si hay cliente)
    puntos_ganados = 0
    if cliente_id is not None and config_puntos.activo:
        puntos_ganados = registrar_puntos_por_compra(
            db,
            usuario_id=cliente_id,
            total_compra_colones=total,
            order_id=None,
        )
        venta = db.query(VentaPOS).filter(VentaPOS.id == venta.id).one()
        venta.puntos_ganados = puntos_ganados
        db.add(venta)
        db.commit()
        db.refresh(venta)
    else:
        venta = db.query(VentaPOS).filter(VentaPOS.id == venta.id).one()

        # 11.5) ✅ Crear comisión automáticamente (si hay config activa)
        config_comision_pos = obtener_configuracion_comision_activa(db, "POS")

        if config_comision_pos:
            # Evitar duplicados si por algún motivo se reintenta el request
            existe = (
                db.query(ComisionVendedor)
                .filter(ComisionVendedor.venta_pos_id == venta.id)
                .first()
            )

            if not existe:
                # Si tienes monto_minimo y no lo cumple, no se crea
                if (config_comision_pos.monto_minimo is None) or (venta.total >= config_comision_pos.monto_minimo):
                    monto_comision = (venta.total * config_comision_pos.porcentaje) / Decimal("100")

                    comision = ComisionVendedor(
                        vendedor_id=venta.vendedor_id,
                        venta_pos_id=venta.id,
                        monto_venta=venta.total,
                        porcentaje_aplicado=config_comision_pos.porcentaje,
                        monto_comision=monto_comision,
                        tipo_venta="POS",
                        estado="PENDIENTE",
                        fecha_venta=venta.fecha_creacion,
                    )
                    db.add(comision)
                    db.commit()


    # 12) Construir respuesta con items
    venta_db = (
        db.query(VentaPOS)
        .options(
            joinedload(VentaPOS.items).joinedload(VentaPOSItem.producto),
        )
        .filter(VentaPOS.id == venta.id)
        .one()
    )

    items_out = [
        POSVentaItemOut(
            id=item.id,
            variante_id=item.variante_id,
            producto_id=item.producto_id,
            nombre_producto=item.producto.nombre if item.producto else "",
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item.subtotal,
        )
        for item in venta_db.items
    ]

    return POSVentaOut(
        id=venta_db.id,
        sucursal_id=venta_db.sucursal_id,
        vendedor_id=venta_db.vendedor_id,
        cliente_id=venta_db.cliente_id,
        nombre_cliente=venta_db.nombre_cliente,
        subtotal=venta_db.subtotal,
        descuento_puntos=venta_db.descuento_puntos or Decimal("0.00"),
        impuesto=venta_db.impuesto or Decimal("0.00"),
        total=venta_db.total,
        puntos_ganados=venta_db.puntos_ganados or 0,
        estado=venta_db.estado,
        fecha_creacion=venta_db.fecha_creacion,
        items=items_out,
    )


# ============================
# VENTAS POS – LISTADO DEL VENDEDOR
# ============================

@router.get("/ventas/mias", response_model=List[POSVentaListItemOut])
def listar_mis_ventas_pos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
    limit: Optional[int] = Query(None, ge=1, le=200),
    offset: Optional[int] = Query(None, ge=0),
):
    """
    Devuelve las ventas POS del vendedor actual (o todas si es ADMIN),
    ordenadas de la más reciente a la más antigua.
    """

    # Valores por defecto si vienen como vacío o no vienen
    if not limit:
        limit = 50
    if offset is None:
        offset = 0

    query = (
        db.query(VentaPOS)
        .options(
            selectinload(VentaPOS.sucursal),
            selectinload(VentaPOS.pagos),
        )
        .order_by(VentaPOS.fecha_creacion.desc())
    )

    if current_user.rol != "ADMIN":
        query = query.filter(VentaPOS.vendedor_id == current_user.id)

    ventas = query.limit(limit).offset(offset).all()

    resultado: List[POSVentaListItemOut] = []

    for v in ventas:
        sucursal_nombre = v.sucursal.nombre if v.sucursal else "Sin sucursal"
        if v.pagos:
            metodo_principal = v.pagos[0].metodo or "DESCONOCIDO"
        else:
            metodo_principal = "SIN_PAGO"

        resultado.append(
            POSVentaListItemOut(
                id=v.id,
                sucursal_id=v.sucursal_id,
                sucursal_nombre=sucursal_nombre,
                impuesto=v.impuesto or Decimal("0.00"),
                total=v.total,
                estado=v.estado,
                fecha_creacion=v.fecha_creacion,
                metodo_principal=metodo_principal,
                nombre_cliente_ticket=v.nombre_cliente,
            )
        )

    return resultado


# ============================
# VENTAS POS – DETALLE
# ============================

@router.get("/ventas/{venta_id}", response_model=POSVentaDetailOut)
def obtener_venta_pos(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Devuelve el detalle completo de una venta POS.
    """
    venta: Optional[VentaPOS] = (
        db.query(VentaPOS)
        .options(
            joinedload(VentaPOS.sucursal),
            joinedload(VentaPOS.vendedor),
            # 🆕 1. Cargar producto, media y RMAs
            selectinload(VentaPOS.items).joinedload(VentaPOSItem.producto).selectinload(Producto.media),
            selectinload(VentaPOS.pagos),
            selectinload(VentaPOS.rmas) 
        )
        .filter(VentaPOS.id == venta_id)
        .first()
    )

    if not venta:
        raise HTTPException(status_code=404, detail="La venta POS indicada no existe.")

    if current_user.rol != "ADMIN" and venta.vendedor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver esta venta.")

    sucursal_nombre = venta.sucursal.nombre if venta.sucursal else "Sin sucursal"
    vendedor_nombre = venta.vendedor.nombre if venta.vendedor else "Desconocido"

    items_out: List[POSVentaItemOut] = []
    for item in venta.items:
        # 🆕 2. EXTRAER URL DE IMAGEN
        imagen_url = None
        if item.producto and item.producto.media:
            medias_sorted = sorted(item.producto.media, key=lambda m: m.orden)
            if medias_sorted:
                imagen_url = medias_sorted[0].url

        items_out.append(
            POSVentaItemOut(
                id=item.id,
                variante_id=item.variante_id,
                producto_id=item.producto_id,
                nombre_producto=item.producto.nombre if item.producto else "",
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=item.subtotal,
                imagen_url=imagen_url # 👈 ASIGNAR
            )
        )

    pagos_out: List[POSPagoPOSOut] = []
    for p in venta.pagos:
        pagos_out.append(
            POSPagoPOSOut(
                id=p.id,
                metodo=p.metodo,
                monto=p.monto,
                referencia=p.referencia,
                fecha=p.fecha,
            )
        )
    
    # 🆕 3. PROCESAR HISTORIAL DE RMAs
    rmas_data = []
    tiene_rma_activo = False
    estados_activos = ["solicitado", "en_revision", "aprobado"]

    if hasattr(venta, "rmas") and venta.rmas:
        for rma in venta.rmas:
            if rma.estado in estados_activos:
                tiene_rma_activo = True
            
            rmas_data.append({
                "id": rma.id,
                "tipo": rma.tipo,
                "estado": rma.estado,
                "motivo": rma.motivo,
                "respuesta_admin": rma.respuesta_admin,
                "fecha": rma.created_at.isoformat()
            })

    return POSVentaDetailOut(
        id=venta.id,
        sucursal_id=venta.sucursal_id,
        sucursal_nombre=sucursal_nombre,
        vendedor_id=venta.vendedor_id,
        vendedor_nombre=vendedor_nombre,
        cliente_id=venta.cliente_id,
        nombre_cliente_ticket=venta.nombre_cliente,
        subtotal=venta.subtotal,
        descuento_puntos=venta.descuento_puntos or Decimal("0"),
        impuesto=venta.impuesto or Decimal("0.00"),
        total=venta.total,
        puntos_ganados=venta.puntos_ganados or 0,
        estado=venta.estado,
        fecha_creacion=venta.fecha_creacion,
        items=items_out,
        pagos=pagos_out,
        # 🆕 4. ENVIAR DATOS NUEVOS
        tiene_rma_activo=tiene_rma_activo,
        solicitudes_rma=rmas_data 
    )

@router.patch("/ventas/{venta_id}/estado", response_model=POSVentaEstadoResponse)
def cambiar_estado_venta_pos(
    venta_id: int,
    data: POSVentaEstadoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_vendedor_o_admin),
):
    """
    Cambia el estado de una venta POS.

    Solo ADMIN o el VENDEDOR dueño de la venta pueden cambiar su estado.

    ⚠️ IMPORTANTE:
    Este endpoint SOLO cambia el campo `estado` de la venta POS.
    No revierte inventario, puntos ni movimientos de caja.
    Si quieres una cancelación "real" (como pedidos), deberías
    implementar un servicio similar a cancelar_pedido.
    """
    venta: Optional[VentaPOS] = (
        db.query(VentaPOS)
        .filter(VentaPOS.id == venta_id)
        .first()
    )

    if not venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La venta POS indicada no existe.",
        )

    # Si es vendedor, solo puede tocar sus propias ventas
    if current_user.rol != "ADMIN" and venta.vendedor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para cambiar el estado de esta venta.",
        )

    venta.estado = data.estado
    db.add(venta)
    db.commit()
    db.refresh(venta)

    return POSVentaEstadoResponse(
        id=venta.id,
        estado=venta.estado,
        fecha_actualizacion=datetime.now(timezone.utc),
    )