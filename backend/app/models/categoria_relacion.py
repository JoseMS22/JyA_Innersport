from sqlalchemy import Table, Column, Integer, ForeignKey
from app.db import Base

categoria_categoria = Table(
    "categoria_categoria",
    Base.metadata,
    Column("categoria_principal_id", Integer, ForeignKey("categoria.id"), primary_key=True),
    Column("categoria_secundaria_id", Integer, ForeignKey("categoria.id"), primary_key=True),
)
