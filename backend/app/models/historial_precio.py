# app/models/historial_precio.py
from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class HistorialPrecio(Base):
    __tablename__ = "historial_precio"

    id = Column(Integer, primary_key=True, index=True)
    variante_id = Column(
        Integer,
        ForeignKey("variante.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    precio = Column(Numeric(10, 2), nullable=False)

    vigente_desde = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    vigente_hasta = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    variante = relationship("Variante", back_populates="historial_precios")
