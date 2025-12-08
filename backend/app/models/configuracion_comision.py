# backend/app/models/configuracion_comision.py
from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Boolean,
    DateTime,
    func,
)
from app.db import Base


class ConfiguracionComision(Base):
    __tablename__ = "configuracion_comision"

    id = Column(Integer, primary_key=True, index=True)
    tipo_venta = Column(String(20), nullable=False, unique=True, index=True)  # ✅ String(20) y unique
    porcentaje = Column(Numeric(5, 2), nullable=False)
    monto_minimo = Column(Numeric(10, 2), nullable=True)  # ✅ nullable
    activo = Column(Boolean, nullable=False, default=True)
    
    fecha_creacion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    fecha_actualizacion = Column(
        DateTime(timezone=True),
        nullable=True,  # ✅ nullable según la tabla
    )