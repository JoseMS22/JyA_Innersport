# backend/app/models/venta_pos.py
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


class VentaPOS(Base):
    __tablename__ = "venta_pos"

    id = Column(Integer, primary_key=True, index=True)

    # Sucursal donde se hizo la venta
    sucursal_id = Column(
        Integer,
        ForeignKey("sucursal.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Vendedor que atendió la venta
    vendedor_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Cliente (opcional)
    cliente_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Nombre mostrado en el ticket:
    # - "Anónimo" por defecto
    # - o nombre del cliente registrado
    # - o un nombre escrito por el vendedor
    nombre_cliente = Column(String(200), nullable=True)

    # Totales
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    descuento_puntos = Column(Numeric(10, 2), nullable=False, default=0)
    impuesto = Column(Numeric(10, 2), nullable=False, default=0)
    total = Column(Numeric(10, 2), nullable=False)

    # Programa de puntos
    puntos_ganados = Column(Integer, nullable=False, default=0)

    # Estado de la venta
    # Ej: PAGADO, CANCELADO (si luego manejamos devoluciones)
    estado = Column(
        String(20),
        nullable=False,
        default="PAGADO",
        index=True,
    )

    cancelado = Column(Boolean, nullable=False, default=False, index=True)
    motivo_cancelacion = Column(Text, nullable=True)

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

    # Relaciones
    sucursal = relationship("Sucursal")
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id])
    cliente = relationship("Usuario", foreign_keys=[cliente_id])

    # Ítems de la venta POS
    items = relationship(
        "VentaPOSItem",
        back_populates="venta",
        cascade="all, delete-orphan",
    )

    # Movimientos de caja asociados a esta venta
    movimientos_caja = relationship(
        "CajaMovimiento",
        back_populates="venta_pos",
        cascade="all, delete-orphan",
    )

    pagos = relationship(
    "PagoPOS",
    back_populates="venta",
    cascade="all, delete-orphan",
)
    
    rmas = relationship("RMA", back_populates="venta_pos", cascade="all, delete-orphan")
