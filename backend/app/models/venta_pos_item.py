# backend/app/models/venta_pos_item.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class VentaPOSItem(Base):
    __tablename__ = "venta_pos_item"

    id = Column(Integer, primary_key=True, index=True)

    venta_pos_id = Column(
        Integer,
        ForeignKey("venta_pos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    variante_id = Column(
        Integer,
        ForeignKey("variante.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    producto_id = Column(
        Integer,
        ForeignKey("producto.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relaciones
    venta = relationship("VentaPOS", back_populates="items")
    variante = relationship("Variante")
    producto = relationship("Producto")
