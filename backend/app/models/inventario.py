# app/models/inventario.py
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class Inventario(Base):
    __tablename__ = "inventario"

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

    cantidad = Column(Integer, nullable=False, default=0)
    min_stock = Column(Integer, nullable=False, default=0)
    max_stock = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    variante = relationship("Variante")
    sucursal = relationship("Sucursal")
