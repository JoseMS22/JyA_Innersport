from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class Sinpe(Base):
    __tablename__ = "sinpe"

    id = Column(Integer, primary_key=True, index=True)

    pedido_id = Column(Integer, ForeignKey("pedido.id", ondelete="CASCADE"), nullable=False, index=True)
    numero_destino = Column(String(30), nullable=False)          # número SINPE al que pagó
    imagen_url = Column(String(255), nullable=False)             # ruta en /media/...
    referencia = Column(String(100), nullable=True)              # opcional si luego quieres
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    pedido = relationship("Pedido")
    __table_args__ = (UniqueConstraint("pedido_id", name="uq_sinpe_pedido"),)
