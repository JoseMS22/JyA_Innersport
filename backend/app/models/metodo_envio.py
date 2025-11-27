# backend/app/models/metodo_envio.py
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ARRAY
from sqlalchemy.sql import func
from app.db import Base


class MetodoEnvio(Base):
    """
    Modelo para métodos de envío disponibles.
    Cumple con US-19 (RF13): Información de costos y tiempos de envío.
    """
    __tablename__ = "metodo_envio"

    id = Column(Integer, primary_key=True, index=True)
    
    # Información básica
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(500), nullable=True)
    
    # Costos
    costo_base = Column(Numeric(10, 2), nullable=False)
    costo_por_km = Column(Numeric(10, 2), nullable=True)  # Opcional para métodos con costo variable
    
    # Tiempos de entrega
    dias_entrega_min = Column(Integer, nullable=False)
    dias_entrega_max = Column(Integer, nullable=False)
    
    # Disponibilidad
    provincias_disponibles = Column(ARRAY(String), nullable=True)  # NULL = todas las provincias
    activo = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<MetodoEnvio(id={self.id}, nombre={self.nombre}, costo_base={self.costo_base})>"