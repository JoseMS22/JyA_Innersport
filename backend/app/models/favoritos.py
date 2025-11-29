# backend/app/models/favoritos.py
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Favorito(Base):
    __tablename__ = "favorito"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variante_id = Column(
        Integer,
        ForeignKey("variante.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    usuario = relationship("Usuario", back_populates="favoritos")
    variante = relationship("Variante")