from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Direccion(Base):
    __tablename__ = "direccion"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="CASCADE"),
        nullable=False,
    )

    provincia = Column(String(80), nullable=False)
    canton = Column(String(80), nullable=False)
    distrito = Column(String(80), nullable=False)
    detalle = Column(String(200), nullable=False)
    telefono = Column(String(30), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relación inversa con Usuario
    usuario = relationship(
        "Usuario",
        back_populates="direccion",
    )
