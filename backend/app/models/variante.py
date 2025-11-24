# app/models/variante.py
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Numeric,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class Variante(Base):
    __tablename__ = "variante"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(
        Integer,
        ForeignKey("producto.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sku = Column(String(100), unique=True, nullable=False, index=True)
    barcode = Column(String(100), unique=True, nullable=True, index=True)

    marca = Column(String(100), nullable=True, index=True)

    color = Column(String(100), nullable=True)
    talla = Column(String(50), nullable=True)

    precio_actual = Column(Numeric(10, 2), nullable=False, default=0)

    activo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    producto = relationship("Producto", back_populates="variantes")
    historial_precios = relationship(
        "HistorialPrecio",
        back_populates="variante",
        cascade="all, delete-orphan",
        order_by="HistorialPrecio.vigente_desde.desc()",
    )
