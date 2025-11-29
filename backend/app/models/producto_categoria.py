# app/models/product_category.py
from sqlalchemy import Column, Integer, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class ProductoCategoria(Base):
    __tablename__ = "producto_categoria"

    producto_id = Column(Integer, ForeignKey("producto.id", ondelete="CASCADE"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categoria.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("producto_id", "categoria_id"),
    )

