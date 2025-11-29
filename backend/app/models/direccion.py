# backend/app/models/direccion.py
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean  # ✅ AÑADIR Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Direccion(Base):
    __tablename__ = "direccion"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    
    # Información de ubicación
    nombre = Column(String(100), nullable=True)
    pais = Column(String(80), default="Costa Rica")
    provincia = Column(String(80), nullable=False)
    canton = Column(String(80), nullable=False)
    distrito = Column(String(80), nullable=False)
    detalle = Column(String(200), nullable=False)
    codigo_postal = Column(String(20), nullable=True)
    telefono = Column(String(30), nullable=True)
    referencia = Column(String(200), nullable=True)
    
    # Campo predeterminada
    predeterminada = Column(Boolean, default=False, nullable=False)  # ✅ Ahora funciona
    
    activa = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    usuario = relationship("Usuario", back_populates="direcciones")