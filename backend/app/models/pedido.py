# backend/app/models/pedido.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    String,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Pedido(Base):
    __tablename__ = "pedido"

    id = Column(Integer, primary_key=True, index=True)

    cliente_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vendedor_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    direccion_envio_id = Column(
        Integer,
        ForeignKey("direccion.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    total = Column(Numeric(10, 2), nullable=False)

    # estados posibles (puedes usar constantes si quieres)
    # CREADO, PAGO_PENDIENTE, PAGADO, EN_PREPARACION, ENVIADO, ENTREGADO, CERRADO, CANCELADO
    estado = Column(String(20), nullable=False, default="PAGADO")

    fecha_creacion = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    fecha_actualizacion = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # relaciones
    cliente = relationship("Usuario", foreign_keys=[cliente_id])
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id])
    direccion_envio = relationship("Direccion")
    pagos = relationship(
        "Pago",
        back_populates="pedido",
        cascade="all, delete-orphan",
    )