# backend/app/models/pedido_item.py
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


class PedidoItem(Base):
    """
    Items/líneas de un pedido.
    Almacena los productos que fueron comprados en cada pedido.
    """
    __tablename__ = "pedido_item"

    id = Column(Integer, primary_key=True, index=True)
    
    pedido_id = Column(
        Integer,
        ForeignKey("pedido.id", ondelete="CASCADE"),
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
    impuesto = Column(Numeric(10, 2), nullable=False, default=0)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    # Relaciones
    pedido = relationship("Pedido", back_populates="items")
    variante = relationship("Variante")
    producto = relationship("Producto")