# backend/app/services/cancelar_pedido_service.py
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.pedido import Pedido
from app.models.pago import Pago
from app.models.carrito import Carrito, CarritoItem
from app.models.inventario import Inventario
from app.models.movimiento_inventario import MovimientoInventario
from app.models.usuario import Usuario
from app.schemas.pedido import (
    ImpactoCancelacionResponse,
    CancelarPedidoResponse,
)
from app.services.audit_service import registrar_auditoria


# Estados que NO permiten cancelación
ESTADOS_NO_CANCELABLES = ["ENVIADO", "ENTREGADO", "CERRADO", "CANCELADO"]


def verificar_puede_cancelar_pedido(
    db: Session,
    pedido: Pedido,
) -> ImpactoCancelacionResponse:
    """
    Verifica si un pedido puede ser cancelado según las reglas de negocio.
    
    Reglas:
    - No se puede cancelar si ya fue enviado, entregado o cerrado
    - No se puede cancelar si ya está cancelado
    - Si el pago fue procesado, se debe advertir sobre reembolso
    
    Returns:
        ImpactoCancelacionResponse con información sobre si puede cancelar
    """
    advertencias = []
    puede_cancelar = True
    motivo_bloqueo = None
    impacto_stock = False
    
    # 1. Verificar si ya está cancelado
    if pedido.cancelado:
        return ImpactoCancelacionResponse(
            puede_cancelar=False,
            motivo_bloqueo="Este pedido ya fue cancelado anteriormente",
            advertencias=[],
            impacto_stock=False,
            mensaje="El pedido ya está cancelado"
        )
    
    # 2. Verificar estado del pedido
    if pedido.estado in ESTADOS_NO_CANCELABLES:
        motivo_bloqueo = f"No se puede cancelar un pedido en estado '{pedido.estado}'"
        
        if pedido.estado == "ENVIADO":
            motivo_bloqueo += ". El pedido ya fue despachado"
        elif pedido.estado == "ENTREGADO":
            motivo_bloqueo += ". El pedido ya fue entregado"
        elif pedido.estado == "CERRADO":
            motivo_bloqueo += ". El pedido ya fue cerrado"
            
        return ImpactoCancelacionResponse(
            puede_cancelar=False,
            motivo_bloqueo=motivo_bloqueo,
            advertencias=[],
            impacto_stock=False,
            mensaje=motivo_bloqueo
        )
    
    # 3. Verificar estado del pago
    pago = (
        db.query(Pago)
        .filter(Pago.pedido_id == pedido.id)
        .first()
    )
    
    if pago:
        if pago.estado == "APROBADO":
            advertencias.append(
                "⚠️ El pago fue procesado. Se generará un reembolso automático"
            )
            advertencias.append(
                f"💳 Método de pago: {pago.metodo}"
            )
            advertencias.append(
                f"💰 Monto a reembolsar: ₡{pedido.total:,.2f}"
            )
        elif pago.estado == "PENDIENTE":
            advertencias.append(
                "ℹ️ El pago está pendiente y será cancelado automáticamente"
            )
    
    # 4. Impacto en stock (siempre hay impacto si el pedido está en preparación o pagado)
    if pedido.estado in ["PAGADO", "EN_PREPARACION"]:
        impacto_stock = True
        advertencias.append(
            "📦 El stock de los productos será reintegrado al inventario"
        )
    
    # 5. Advertencia sobre tiempo de reembolso
    if pago and pago.estado == "APROBADO":
        advertencias.append(
            "⏱️ El reembolso puede tardar de 5 a 10 días hábiles según tu banco"
        )
    
    mensaje = "Puedes cancelar este pedido"
    if advertencias:
        mensaje += ", pero ten en cuenta lo siguiente:"
    
    return ImpactoCancelacionResponse(
        puede_cancelar=True,
        motivo_bloqueo=None,
        advertencias=advertencias,
        impacto_stock=impacto_stock,
        mensaje=mensaje
    )


def reintegrar_stock_pedido(
    db: Session,
    pedido: Pedido,
    usuario_id: int,
) -> Tuple[bool, int]:
    """
    Reintegra el stock de los items del pedido al inventario.
    
    Returns:
        Tuple[bool, int]: (éxito, cantidad de items reintegrados)
    """
    # Obtener items del carrito que generó el pedido
    carrito = (
        db.query(Carrito)
        .options(joinedload(Carrito.items).joinedload(CarritoItem.variante))
        .filter(
            Carrito.usuario_id == pedido.cliente_id,
            Carrito.estado == "COMPLETADO",
        )
        .order_by(Carrito.updated_at.desc())
        .first()
    )
    
    if not carrito or not carrito.items:
        # No se puede reintegrar si no hay información del carrito
        return False, 0
    
    items_reintegrados = 0
    
    # Asumimos que hay una sucursal principal (ID 1) o la primera disponible
    # En producción, esto debería venir de una configuración
    sucursal_id = 1
    
    for item in carrito.items:
        try:
            # Buscar inventario existente
            inventario = (
                db.query(Inventario)
                .filter(
                    Inventario.variante_id == item.variante_id,
                    Inventario.sucursal_id == sucursal_id,
                )
                .first()
            )
            
            if inventario:
                # Reintegrar cantidad
                inventario.cantidad += item.cantidad
                
                # Registrar movimiento
                movimiento = MovimientoInventario(
                    variante_id=item.variante_id,
                    sucursal_id=sucursal_id,
                    cantidad=item.cantidad,
                    tipo="ENTRADA",
                    source_type="CANCELACION_PEDIDO",
                    referencia=f"Cancelación pedido #{pedido.id}",
                    observacion=f"Reintegro por cancelación de pedido",
                    usuario_id=usuario_id,
                )
                db.add(movimiento)
                items_reintegrados += 1
            
        except Exception as e:
            # Log error pero continuar con otros items
            print(f"Error reintegrando stock para variante {item.variante_id}: {e}")
            continue
    
    return items_reintegrados > 0, items_reintegrados


def cancelar_pedido(
    db: Session,
    pedido_id: int,
    motivo: str,
    usuario: Usuario,
    ip_address: str = None,
) -> CancelarPedidoResponse:
    """
    Cancela un pedido según las reglas de negocio.
    
    Args:
        db: Sesión de base de datos
        pedido_id: ID del pedido a cancelar
        motivo: Motivo de cancelación
        usuario: Usuario que solicita la cancelación
        ip_address: IP del usuario (para auditoría)
    
    Returns:
        CancelarPedidoResponse con resultado de la operación
    """
    # 1. Obtener pedido
    pedido = (
        db.query(Pedido)
        .filter(Pedido.id == pedido_id)
        .first()
    )
    
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado"
        )
    
    # 2. Verificar que el usuario sea el dueño del pedido o admin
    if usuario.rol != "ADMIN" and pedido.cliente_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para cancelar este pedido"
        )
    
    # 3. Verificar si se puede cancelar
    impacto = verificar_puede_cancelar_pedido(db, pedido)
    
    if not impacto.puede_cancelar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=impacto.motivo_bloqueo or "No se puede cancelar este pedido"
        )
    
    # 4. Reintegrar stock si aplica
    stock_reintegrado = False
    items_reintegrados = 0
    
    if impacto.impacto_stock:
        stock_reintegrado, items_reintegrados = reintegrar_stock_pedido(
            db, pedido, usuario.id
        )
    
    # 5. Actualizar estado del pago (si existe)
    pago = (
        db.query(Pago)
        .filter(Pago.pedido_id == pedido.id)
        .first()
    )
    
    if pago and pago.estado == "APROBADO":
        # Marcar como reembolsado (en producción aquí iría integración con pasarela)
        pago.estado = "REEMBOLSADO"
    elif pago and pago.estado == "PENDIENTE":
        pago.estado = "CANCELADO"
    
    # 6. Actualizar pedido
    pedido.cancelado = True
    pedido.estado = "CANCELADO"
    pedido.motivo_cancelacion = motivo
    pedido.fecha_cancelacion = datetime.now(timezone.utc)
    pedido.cancelado_por_id = usuario.id
    
    # 7. Registrar auditoría
    registrar_auditoria(
        db=db,
        usuario_id=usuario.id,
        accion="CANCELAR_PEDIDO",
        entidad="Pedido",
        entidad_id=pedido.id,
        detalles=f"Pedido #{pedido.id} cancelado. Motivo: {motivo}. Stock reintegrado: {items_reintegrados} items",
        ip_address=ip_address,
    )
    
    # 8. Commit de cambios
    db.commit()
    db.refresh(pedido)
    
    # 9. Preparar respuesta
    mensaje_exito = f"Pedido #{pedido.id} cancelado exitosamente"
    
    if stock_reintegrado:
        mensaje_exito += f". Se reintegraron {items_reintegrados} productos al inventario"
    
    if pago and pago.estado == "REEMBOLSADO":
        mensaje_exito += f". Se procesará el reembolso de ₡{pedido.total:,.2f}"
    
    return CancelarPedidoResponse(
        success=True,
        mensaje=mensaje_exito,
        pedido_id=pedido.id,
        nuevo_estado=pedido.estado,
        stock_reintegrado=stock_reintegrado,
        items_reintegrados=items_reintegrados,
    )