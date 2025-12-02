# backend/app/models/pedido.py
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

    # 🏬 Sucursal a la que se asigna el pedido
    sucursal_id = Column(
        Integer,
        ForeignKey("sucursal.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    # 💳 Campos adicionales para checkout mejorado
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    costo_envio = Column(Numeric(10, 2), nullable=True, default=0)
    descuento_puntos = Column(Numeric(10, 2), nullable=True, default=0)

    total = Column(Numeric(10, 2), nullable=False)

    # 🆕 Campos para programa de puntos y envío
    puntos_ganados = Column(Integer, nullable=True, default=0)
    metodo_envio = Column(String(50), nullable=True)
    numero_pedido = Column(String(50), nullable=True, unique=True, index=True)

    # estados posibles (usados actualmente)
    # PAGADO, EN_PREPARACION, ENVIADO, ENTREGADO, CANCELADO
    estado = Column(String(20), nullable=False, default="PAGADO")

    # Campos de cancelación
    cancelado = Column(Boolean, nullable=False, default=False, index=True)
    motivo_cancelacion = Column(Text, nullable=True)
    fecha_cancelacion = Column(DateTime(timezone=True), nullable=True)
    cancelado_por_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

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
    cancelado_por = relationship("Usuario", foreign_keys=[cancelado_por_id])
    direccion_envio = relationship("Direccion")
    sucursal = relationship("Sucursal")

    pagos = relationship(
        "Pago",
        back_populates="pedido",
        cascade="all, delete-orphan",
    )

    # items del pedido
    items = relationship(
        "PedidoItem",
        back_populates="pedido",
        cascade="all, delete-orphan",
    )
