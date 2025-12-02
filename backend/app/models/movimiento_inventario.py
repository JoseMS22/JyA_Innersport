# app/models/movimiento_inventario.py
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class MovimientoInventario(Base):
    __tablename__ = "movimiento_inventario"

    id = Column(Integer, primary_key=True, index=True)
    variante_id = Column(
        Integer,
        ForeignKey("variante.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sucursal_id = Column(
        Integer,
        ForeignKey("sucursal.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # cantidad siempre positiva; el signo lo define "tipo"
    cantidad = Column(Integer, nullable=False)

    # ENTRADA, SALIDA, AJUSTE, TRASPASO
    tipo = Column(String(20), nullable=False)

    # opcional: PEDIDO, POS, AJUSTE_MANUAL, etc.
    source_type = Column(String(30), nullable=True)
    referencia = Column(String(100), nullable=True)
    observacion = Column(String(500), nullable=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True
    )


    fecha = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    variante = relationship("Variante")
    sucursal = relationship("Sucursal")

    usuario = relationship("Usuario")