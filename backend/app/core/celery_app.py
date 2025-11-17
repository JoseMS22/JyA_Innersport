# backend/app/core/celery_app.py

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings  # aquí ya usas settings en otros lugares


celery_app = Celery(
    "tienda_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Buscar tareas dentro del paquete app.tasks
celery_app.autodiscover_tasks(["app.tasks"])

# Zona horaria (puedes usar la tuya si quieres)
celery_app.conf.timezone = "UTC"

# Tareas periódicas (beat schedule)
celery_app.conf.beat_schedule = {
    "purge-soft-deleted-users-daily": {
        "task": "app.tasks.user_cleanup.purge_soft_deleted_users",
        "schedule": crontab(hour=3, minute=0),  # todos los días a las 03:00 UTC
    },
}