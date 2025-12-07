# backend/app/models/comision_vendedor.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    String,
    Numeric,
    DateTime,
    Text,
    func,
)
from sqlalchemy.orm import relationship
from app.db import Base


class ComisionVendedor(Base):
    __tablename__ = "comisiones_vendedor"

    id = Column(Integer, primary_key=True, index=True)
    
    vendedor_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    
    venta_pos_id = Column(
        Integer,
        ForeignKey("venta_pos.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    pedido_id = Column(
        Integer,
        ForeignKey("pedido.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    monto_venta = Column(Numeric(10, 2), nullable=False)
    porcentaje_aplicado = Column(Numeric(5, 2), nullable=False)
    monto_comision = Column(Numeric(10, 2), nullable=False)
    tipo_venta = Column(String(50), nullable=False, index=True)  # 'POS', 'ONLINE'
    
    estado = Column(
        String(50),
        nullable=False,
        default='PENDIENTE',
        index=True,
    )  # 'PENDIENTE', 'LIQUIDADA', 'CANCELADA'
    
    fecha_venta = Column(DateTime(timezone=True), nullable=False, index=True)
    fecha_liquidacion = Column(DateTime(timezone=True), nullable=True)
    
    # ✅ CORREGIDO: liquidada_por → liquidado_por_id
    liquidado_por_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    observaciones = Column(Text, nullable=True)
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    
    # ✅ CORREGIDO: Relaciones
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id])
    venta_pos = relationship("VentaPOS", foreign_keys=[venta_pos_id])
    pedido = relationship("Pedido", foreign_keys=[pedido_id])
    liquidador = relationship("Usuario", foreign_keys=[liquidado_por_id])  # ✅ CAMBIADO