# backend/app/models/auditoria.py

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class AuditoriaUsuario(Base):
    """
    Tabla de auditoría para registrar todas las acciones críticas del sistema.
    Cumple con RNF12 (Auditoría y Registro de Actividades).
    """
    __tablename__ = "auditoria_usuario"

    id = Column(Integer, primary_key=True, index=True)

    # Usuario que realizó la acción
    usuario_id = Column(
        Integer,
        ForeignKey("usuario.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Tipo de acción realizada
    # Ejemplos: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, 
    #           REGISTER, CHANGE_PASSWORD, RESET_PASSWORD,
    #           CREATE_ORDER, CANCEL_ORDER, PROCESS_PAYMENT, etc.
    accion = Column(String(50), nullable=False, index=True)

    # Entidad afectada
    # Ejemplos: Usuario, Producto, Pedido, VentaPOS, Caja, etc.
    entidad = Column(String(50), nullable=False, index=True)

    # ID de la entidad afectada (si aplica)
    entidad_id = Column(Integer, nullable=True, index=True)

    # Detalles adicionales en formato JSON o texto
    # Puede contener valores antes/después del cambio, campos modificados, etc.
    detalles = Column(Text, nullable=True)

    # IP desde donde se realizó la acción
    ip_address = Column(String(45), nullable=True)  # IPv6 puede ser más largo

    # Timestamp de la acción
    fecha = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relación con Usuario
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

    def __repr__(self):
        return (
            f"<AuditoriaUsuario(id={self.id}, "
            f"usuario_id={self.usuario_id}, "
            f"accion={self.accion}, "
            f"entidad={self.entidad}, "
            f"fecha={self.fecha})>"
        )