# backend/app/core/logging_config.py

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime


# Crear directorio de logs si no existe
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)


def setup_logging():
    """
    Configura el sistema de logging centralizado para toda la aplicación.
    Cumple con RNF17 (Registro y Monitoreo de Errores del Sistema).
    
    Niveles de log:
    - DEBUG: Información detallada para diagnóstico
    - INFO: Confirmación de que las cosas funcionan como se espera
    - WARNING: Indicación de algo inesperado, pero la aplicación sigue funcionando
    - ERROR: Error que impidió que se ejecute alguna función
    - CRITICAL: Error grave que puede impedir que la aplicación continúe
    """
    
    # Formato del log
    log_format = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Logger raíz
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Handler para consola (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    root_logger.addHandler(console_handler)

    # Handler para archivo general (rotativo)
    general_file_handler = RotatingFileHandler(
        LOGS_DIR / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    general_file_handler.setLevel(logging.INFO)
    general_file_handler.setFormatter(log_format)
    root_logger.addHandler(general_file_handler)

    # Handler para errores (archivo separado)
    error_file_handler = RotatingFileHandler(
        LOGS_DIR / "errors.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(log_format)
    root_logger.addHandler(error_file_handler)

    # Logger específico para auditoría
    audit_logger = logging.getLogger("audit")
    audit_logger.setLevel(logging.INFO)
    
    audit_file_handler = RotatingFileHandler(
        LOGS_DIR / "audit.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10,  # Más backups para auditoría
        encoding="utf-8",
    )
    audit_file_handler.setFormatter(log_format)
    audit_logger.addHandler(audit_file_handler)

    # Evitar que los logs de auditoría se dupliquen en el logger raíz
    audit_logger.propagate = False

    # Silenciar logs muy verbosos de librerías externas
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    root_logger.info("=" * 60)
    root_logger.info("Sistema de logging inicializado correctamente")
    root_logger.info(f"Directorio de logs: {LOGS_DIR.absolute()}")
    root_logger.info("=" * 60)


def get_logger(name: str) -> logging.Logger:
    """
    Obtiene un logger configurado para un módulo específico.
    
    Args:
        name: Nombre del módulo (generalmente __name__)
    
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)


def get_audit_logger() -> logging.Logger:
    """
    Obtiene el logger específico para auditoría.
    
    Returns:
        Logger de auditoría
    """
    return logging.getLogger("audit")