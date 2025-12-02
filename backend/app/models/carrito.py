# app/models/carrito.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    String,
    Numeric,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Carrito(Base):
    __tablename__ = "carrito"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    estado = Column(String(20), nullable=False, default="ABIERTO")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # relaciones
    usuario = relationship("Usuario", back_populates="carritos")
    items = relationship(
        "CarritoItem",
        back_populates="carrito",
        cascade="all, delete-orphan",
    )


class CarritoItem(Base):
    __tablename__ = "carrito_item"

    id = Column(Integer, primary_key=True, index=True)
    carrito_id = Column(
        Integer,
        ForeignKey("carrito.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variante_id = Column(
        Integer,
        ForeignKey("variante.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # relaciones
    carrito = relationship("Carrito", back_populates="items")
    variante = relationship("Variante")