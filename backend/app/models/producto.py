# app/models/product.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base

class Producto(Base):
    __tablename__ = "producto"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    categorias = relationship(
        "Categoria",
        secondary="producto_categoria",
        back_populates="productos",
    )

    media = relationship("Media", back_populates="producto", cascade="all, delete-orphan")
    variantes = relationship("Variante", back_populates="producto")
