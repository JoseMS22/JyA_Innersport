# backend/app/core/config.py
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración general del backend."""
    # BD
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://tienda_user:super_seguro@db:5432/tienda_db",
    )

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Seguridad
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_key_cambia_esto")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # Correo (Resend)
    RESEND_API_KEY: str                      # obligatorio, viene del entorno
    EMAIL_FROM_NAME: str = "Innersport Tienda"
    EMAIL_FROM_ADDRESS: str = "onboarding@resend.dev"  # default ok
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # 🔹 Cookies - IMPORTANTE: False en desarrollo local
    COOKIE_SECURE: bool = False  # Cambiar a True solo en producción con HTTPS

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"

    ACCOUNT_DELETION_GRACE_DAYS: int = int(os.getenv("ACCOUNT_DELETION_GRACE_DAYS", "7"))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()