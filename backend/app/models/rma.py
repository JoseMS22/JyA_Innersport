# backend/app/models/rma.py
import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, func
from sqlalchemy.orm import relationship
from app.db import Base

class RMAEstado(str, enum.Enum):
    SOLICITADO = "solicitado"
    EN_REVISION = "en_revision"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"
    COMPLETADO = "completado"

class RMATipo(str, enum.Enum):
    DEVOLUCION = "devolucion"  # Reembolso monetario
    CAMBIO = "cambio"          # Cambio por otro producto (mismo valor o variante)

class RMA(Base):
    __tablename__ = "rmas"

    id = Column(Integer, primary_key=True, index=True)
    
    # Vinculación
    pedido_id = Column(Integer, ForeignKey("pedido.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False, index=True)
    
    # Detalles de la solicitud
    tipo = Column(Enum(RMATipo), nullable=False)
    estado = Column(Enum(RMAEstado), default=RMAEstado.SOLICITADO, index=True)
    motivo = Column(Text, nullable=False)
    
    # Gestión administrativa
    respuesta_admin = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    pedido = relationship("Pedido", back_populates="rmas")
    usuario = relationship("Usuario") # Cliente que solicita
    items = relationship("RMAItem", back_populates="rma", cascade="all, delete-orphan")

    # Opcional: URL de evidencia (foto, video, etc.)
    evidencia_url = Column(String, nullable=True)

class RMAItem(Base):
    __tablename__ = "rma_items"
    
    id = Column(Integer, primary_key=True, index=True)
    rma_id = Column(Integer, ForeignKey("rmas.id", ondelete="CASCADE"), nullable=False)
    pedido_item_id = Column(Integer, ForeignKey("pedido_item.id"), nullable=False)
    
    cantidad = Column(Integer, nullable=False)
    
    rma = relationship("RMA", back_populates="items")
    pedido_item = relationship("PedidoItem")