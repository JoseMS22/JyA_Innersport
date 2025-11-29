# backend/app/models/pago.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    String,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Pago(Base):
    __tablename__ = "pago"

    id = Column(Integer, primary_key=True, index=True)

    pedido_id = Column(
        Integer,
        ForeignKey("pedido.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    monto = Column(Numeric(10, 2), nullable=False)
    referencia = Column(String(50), nullable=True)

    # metodo: EFECTIVO, TARJETA, MIXTO, etc.
    metodo = Column(String(20), nullable=False, default="TARJETA")

    # estado: PENDIENTE, APROBADO, RECHAZADO
    estado = Column(String(20), nullable=False, default="APROBADO")

    fecha = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    pedido = relationship("Pedido", back_populates="pagos")