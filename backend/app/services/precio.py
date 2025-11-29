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

    # (Opcional) validar que no sea negativo
    if nuevo_precio < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El precio no puede ser negativo.",
        )

    ahora = datetime.now(timezone.utc)

    # Buscar historial vigente (si existe)
    historial_vigente = (
        db.query(HistorialPrecio)
        .filter(
            HistorialPrecio.variante_id == variante_id,
            HistorialPrecio.vigente_hasta.is_(None),
        )
        .order_by(HistorialPrecio.vigente_desde.desc())
        .first()
    )

    # ⚠️ OJO:
    # - Si YA hay historial vigente y el precio es el mismo → no hacemos nada.
    # - Si NO hay historial, aunque el precio sea igual al precio_actual, SÍ creamos el primero.
    if historial_vigente and variante.precio_actual == nuevo_precio:
        return variante

    # Cerrar historial vigente (si existe)
    if historial_vigente:
        historial_vigente.vigente_hasta = ahora

    # Crear nuevo registro de historial (primer precio o cambio)
    nuevo_historial = HistorialPrecio(
        variante_id=variante_id,
        precio=nuevo_precio,
        vigente_desde=ahora,
        vigente_hasta=None,
    )
    db.add(nuevo_historial)

    # Actualizar precio actual en la variante
    variante.precio_actual = nuevo_precio

    db.commit()
    db.refresh(variante)
    return variante
