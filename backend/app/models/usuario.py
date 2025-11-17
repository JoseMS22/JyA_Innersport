# backend/app/models/usuario.py

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db import Base


class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    correo = Column(String(100), nullable=False, unique=True, index=True)
    contrasena_hash = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    rol = Column(String(20), nullable=False, default="CLIENTE")
    activo = Column(Boolean, nullable=False, default=True)

    # Verificación de correo
    email_verificado = Column(Boolean, nullable=False, default=False)
    token_verificacion = Column(String(255), nullable=True, index=True)
    token_verificacion_expira = Column(DateTime(timezone=True), nullable=True)

    # Recuperación de contraseña
    reset_password_token = Column(String(255), nullable=True, index=True)
    reset_password_token_expira = Column(DateTime(timezone=True), nullable=True)
    reset_password_attempts = Column(Integer, nullable=False, default=0)
    ultimo_intento_reset = Column(DateTime(timezone=True), nullable=True)

    # 🔹 Eliminación de cuenta (de ramaAdrian)
    pendiente_eliminacion = Column(Boolean, nullable=False, default=False)
    eliminacion_solicitada_at = Column(DateTime(timezone=True), nullable=True)
    eliminacion_programada_at = Column(DateTime(timezone=True), nullable=True)

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

    # Relación 1:1 con Dirección
    direccion = relationship(
        "Direccion",
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",
    )