"""carrito, favoritos, puntos y metodo_envio

Revision ID: 27c763ee3a6d
Revises: e38b69ac197c
Create Date: 2025-11-29 05:06:25.615926

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '27c763ee3a6d'
down_revision: Union[str, None] = 'e38b69ac197c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: dejamos esta migración sin cambios reales en el esquema.
    # Las tablas de carrito, favoritos, puntos y método_envio
    # ya existen en la base de datos debido a migraciones anteriores.
    pass


def downgrade() -> None:
    # No-op: no revertimos nada porque esta revisión no aplica cambios.
    pass
