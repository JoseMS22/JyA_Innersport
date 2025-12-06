# backend/app/models/caja_turno.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Numeric,
    String,
    DateTime,
    Boolean,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class CajaTurno(Base):
    __tablename__ = "caja_turno"

    id = Column(Integer, primary_key=True, index=True)

    # Caja por vendedor (independiente de sucursal)
    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    monto_apertura = Column(Numeric(10, 2), nullable=False)

    monto_teorico_cierre = Column(Numeric(10, 2), nullable=True)
    monto_real_cierre = Column(Numeric(10, 2), nullable=True)
    diferencia = Column(Numeric(10, 2), nullable=True)

    estado = Column(
        String(20),
        nullable=False,
        default="ABIERTA",  # ABIERTA / CERRADA
        index=True,
    )

    observaciones = Column(Text, nullable=True)

    fecha_apertura = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    fecha_cierre = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    usuario = relationship("Usuario", backref="cajas_turno")
    movimientos = relationship(
        "CajaMovimiento",
        back_populates="caja_turno",
        cascade="all, delete-orphan",
    )
