# backend/app/models/caja_movimientos.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    String,
    DateTime,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class CajaMovimiento(Base):
    __tablename__ = "caja_movimiento"

    id = Column(Integer, primary_key=True, index=True)

    caja_turno_id = Column(
        Integer,
        ForeignKey("caja_turno.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # De qué sucursal es este movimiento (por el pedido)
    sucursal_id = Column(
        Integer,
        ForeignKey("sucursal.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    venta_pos_id = Column(
        Integer,
        ForeignKey("venta_pos.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )


    pedido_id = Column(
        Integer,
        ForeignKey("pedido.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    pago_id = Column(
        Integer,
        ForeignKey("pago.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Tipo de movimiento:
    # VENTA_EFECTIVO, DEVOLUCION_EFECTIVO, RETIRO_EFECTIVO, INGRESO_EFECTIVO
    tipo = Column(String(30), nullable=False, index=True)

    monto = Column(Numeric(10, 2), nullable=False)

    descripcion = Column(Text, nullable=True)

    fecha = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relaciones
    caja_turno = relationship("CajaTurno", back_populates="movimientos")
    sucursal = relationship("Sucursal")
    pedido = relationship("Pedido")
    pago = relationship("Pago")
    venta_pos = relationship("VentaPOS", back_populates="movimientos_caja")

