# backend/app/models/programa_puntos.py
from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class ProgramaPuntosConfig(Base):
    __tablename__ = "programa_puntos_config"

    id = Column(Integer, primary_key=True, index=True)

    # ¿Está activo el programa de puntos?
    activo = Column(Boolean, nullable=False, default=False)

    # Cuántos puntos se generan por cada colón gastado.
    # Ej: 0.001 => 1 punto por cada 1000 colones.
    puntos_por_colon = Column(Numeric(10, 4), nullable=False, default=0.0)

    # Cuántos colones vale 1 punto al redimir.
    # Ej: 10 => 1 punto = ₡10
    valor_colon_por_punto = Column(Numeric(10, 2), nullable=False, default=0.0)

    # Mínimo de compra para poder usar puntos (opcional)
    monto_minimo_para_redimir = Column(Numeric(10, 2), nullable=True)

    # Porcentaje máximo de la compra que se puede pagar con puntos (0–100)
    porcentaje_max_descuento = Column(Numeric(5, 2), nullable=True)

    # 💥 Máximo descuento por compra en colones (configurable por admin)
    # Ej: 20000 => se pueden usar como máximo ₡20.000 en puntos por compra.
    max_descuento_por_compra_colones = Column(Numeric(10, 2), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class SaldoPuntosUsuario(Base):
    __tablename__ = "saldo_puntos_usuario"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), unique=True, nullable=False)

    saldo = Column(Integer, nullable=False, default=0)

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    usuario = relationship("Usuario", back_populates="saldo_puntos")


class MovimientoPuntosUsuario(Base):
    __tablename__ = "movimiento_puntos_usuario"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)

    # 'earn' (gana), 'redeem' (usa), 'adjust' (ajuste manual admin)
    tipo = Column(String(20), nullable=False)

    # puntos positivos o negativos
    puntos = Column(Integer, nullable=False)

    descripcion = Column(Text, nullable=True)

    # order_id si luego lo quieres enlazar a una tabla Pedido/Orden
    order_id = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="movimientos_puntos")