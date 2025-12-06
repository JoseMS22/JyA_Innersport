# backend/app/models/pago_pos.py
from sqlalchemy import Column, Integer, ForeignKey, Numeric, String, DateTime, func
from sqlalchemy.orm import relationship

from app.db import Base


class PagoPOS(Base):
    __tablename__ = "pago_pos"

    id = Column(Integer, primary_key=True, index=True)

    venta_pos_id = Column(
        Integer,
        ForeignKey("venta_pos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    metodo = Column(String(20), nullable=False)  # EFECTIVO, TARJETA, SINPE, etc.
    monto = Column(Numeric(10, 2), nullable=False)

    referencia = Column(String(50), nullable=True)

    estado = Column(String(20), nullable=False, default="APROBADO")

    fecha = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    venta = relationship("VentaPOS", back_populates="pagos")
