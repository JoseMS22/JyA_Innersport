# app/services/inventario.py
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.inventario import Inventario
from app.models.movimiento_inventario import MovimientoInventario
from app.models.variante import Variante
from app.models.sucursal import Sucursal


def obtener_o_crear_inventario(
    db: Session,
    variante_id: int,
    sucursal_id: int,
) -> Inventario:
    inv = (
        db.query(Inventario)
        .filter(
            Inventario.variante_id == variante_id,
            Inventario.sucursal_id == sucursal_id,
        )
        .first()
    )
    if inv:
        return inv

    # Verificar que existan la variante y la sucursal
    variante = db.query(Variante).get(variante_id)
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )

    sucursal = db.query(Sucursal).get(sucursal_id)
    if not sucursal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada.",
        )

    inv = Inventario(
        variante_id=variante_id,
        sucursal_id=sucursal_id,
        cantidad=0,
        min_stock=0,
    )
    db.add(inv)
    db.flush()  # para obtener id sin hacer commit todavía
    return inv


def ajustar_inventario(
    db: Session,
    *,
    variante_id: int,
    sucursal_id: int,
    tipo: str,
    cantidad: int,
    motivo: Optional[str] = None,
    referencia: Optional[str] = None,
    min_stock: Optional[int] = None,
    source_type: Optional[str] = "AJUSTE_MANUAL",
    usuario_id: Optional[int] = None,
) -> Inventario:
    if cantidad <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cantidad debe ser mayor que cero.",
        )

    inv = obtener_o_crear_inventario(db, variante_id, sucursal_id)

    # Determinar signo
    tipo = tipo.upper()
    if tipo not in ("ENTRADA", "SALIDA", "AJUSTE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de movimiento inválido. Use ENTRADA, SALIDA o AJUSTE.",
        )

    if tipo == "ENTRADA":
        nueva_cantidad = inv.cantidad + cantidad
    elif tipo == "SALIDA":
        nueva_cantidad = inv.cantidad - cantidad
    else:  # AJUSTE → aquí puedes decidir política
        # Por ahora, interpreto AJUSTE como "poner" cantidad exacta:
        nueva_cantidad = cantidad

    if nueva_cantidad < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ajuste dejaría el inventario en cantidad negativa.",
        )

    inv.cantidad = nueva_cantidad

    if min_stock is not None:
        inv.min_stock = min_stock

    mov = MovimientoInventario(
        variante_id=variante_id,
        sucursal_id=sucursal_id,
        cantidad=cantidad,
        tipo=tipo,
        source_type=source_type,
        referencia=referencia,
        observacion=motivo,
        usuario_id=usuario_id,
    )
    db.add(mov)

    db.commit()
    db.refresh(inv)
    return inv
