# app/models/category.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db import Base
from sqlalchemy.orm import relationship
from app.models.categoria_relacion import categoria_categoria

class Categoria(Base):
    __tablename__ = "categoria"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True)
    descripcion = Column(String(500), nullable=True)
    activo = Column(Boolean, default=True)

    principal = Column(Boolean, default=False)
    secundaria = Column(Boolean, default=False)

    slug = Column(String(255), nullable=True, unique=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # relación muchos-a-muchos con Producto
    productos = relationship(
        "Producto",
        secondary="producto_categoria",
        back_populates="categorias",
    )

    # Relación: una categoría principal tiene muchas secundarias
    secundarias = relationship(
        "Categoria",
        secondary=categoria_categoria,
        primaryjoin=id == categoria_categoria.c.categoria_principal_id,
        secondaryjoin=id == categoria_categoria.c.categoria_secundaria_id,
        backref="principales"
    )
