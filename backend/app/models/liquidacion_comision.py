# backend/app/models/liquidacion_comision.py
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    String,
    Numeric,
    Date,
    DateTime,
    Text,
    func,
)
from sqlalchemy.orm import relationship
from app.db import Base


class LiquidacionComision(Base):
    __tablename__ = "liquidaciones_comisiones"

    id = Column(Integer, primary_key=True, index=True)
    
    vendedor_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    
    periodo_inicio = Column(Date, nullable=False, index=True)
    periodo_fin = Column(Date, nullable=False, index=True)
    
    monto_total = Column(Numeric(10, 2), nullable=False)
    cantidad_ventas = Column(Integer, nullable=False)
    
    liquidada_por = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
    )
    
    fecha_liquidacion = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    metodo_pago = Column(String(50), nullable=True)  # 'TRANSFERENCIA', 'EFECTIVO', 'CHEQUE'
    referencia_pago = Column(String(100), nullable=True)
    observaciones = Column(Text, nullable=True)
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    # Relaciones
    vendedor = relationship("Usuario", foreign_keys=[vendedor_id])
    liquidador = relationship("Usuario", foreign_keys=[liquidada_por])