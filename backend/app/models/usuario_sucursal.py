# backend/app/models/usuario_sucursal.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Boolean,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class UsuarioSucursal(Base):
    __tablename__ = "usuario_sucursal"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sucursal_id = Column(
        Integer,
        ForeignKey("sucursal.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ¿En esta sucursal puede vender?
    puede_vender = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "sucursal_id",
            name="uq_usuario_sucursal_unica",
        ),
    )

    # Relaciones opcionales (si quieres navegar desde aquí)
    usuario = relationship("Usuario", backref="sucursales_asignadas")
    sucursal = relationship("Sucursal", backref="usuarios_asignados")
