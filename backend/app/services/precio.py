# app/services/precio.py
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.variante import Variante
from app.models.historial_precio import HistorialPrecio


def cambiar_precio_variante(
    db: Session,
    variante_id: int,
    nuevo_precio: Decimal,
    usuario_id: int | None = None,  # por si luego quieres auditar
):
    variante = db.query(Variante).get(variante_id)
    if not variante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Variante no encontrada.",
        )

    ahora = datetime.now(timezone.utc)

    # Si el precio es el mismo, no hacemos nada
    if variante.precio_actual == nuevo_precio:
        return variante

    # Cerrar historial vigente (si existe)
    historial_vigente = (
        db.query(HistorialPrecio)
        .filter(
            HistorialPrecio.variante_id == variante_id,
            HistorialPrecio.vigente_hasta.is_(None),
        )
        .order_by(HistorialPrecio.vigente_desde.desc())
        .first()
    )

    if historial_vigente:
        historial_vigente.vigente_hasta = ahora

    # Crear nuevo registro de historial
    nuevo_historial = HistorialPrecio(
        variante_id=variante_id,
        precio=nuevo_precio,
        vigente_desde=ahora,
    )
    db.add(nuevo_historial)

    # Actualizar precio actual en la variante
    variante.precio_actual = nuevo_precio

    db.commit()
    db.refresh(variante)
    return variante
