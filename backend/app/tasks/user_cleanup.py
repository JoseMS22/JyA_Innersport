# backend/app/tasks/user_cleanup.py

from datetime import datetime, timezone
import logging

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.models.direccion import Direccion

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.user_cleanup.purge_soft_deleted_users")
def purge_soft_deleted_users():
    """
    Tarea programada que realiza el hard delete de usuarios:
    - que estén marcados como pendiente_eliminacion = True
    - y cuya eliminacion_programada_at ya haya pasado
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        usuarios = (
            db.query(Usuario)
            .filter(
                Usuario.pendiente_eliminacion.is_(True),
                Usuario.eliminacion_programada_at.isnot(None),
                Usuario.eliminacion_programada_at <= now,
            )
            .all()
        )

        if not usuarios:
            logger.info("purge_soft_deleted_users: no hay usuarios para purgar.")
            return

        for u in usuarios:
            # 🔎 Auditoría mínima sin PII
            logger.info(
                "PURGE_USER user_id=%s requested_at=%s scheduled_at=%s",
                u.id,
                u.eliminacion_solicitada_at,
                u.eliminacion_programada_at,
            )

            # Borrar dirección asociada
            db.query(Direccion).filter(Direccion.usuario_id == u.id).delete()

            # Borrar usuario
            db.delete(u)

        db.commit()
        logger.info("purge_soft_deleted_users: %d usuarios purgados.", len(usuarios))

    except Exception as e:
        logger.exception("Error en purge_soft_deleted_users: %s", e)
        db.rollback()
        # aquí también podrías registrar en una tabla de auditoría si quisieras
    finally:
        db.close()