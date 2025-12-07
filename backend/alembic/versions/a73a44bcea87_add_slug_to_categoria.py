"""empty migration to avoid duplicate slug creation"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a73a44bcea87'
down_revision: Union[str, None] = '129266c307e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Esta migración queda vacía porque la columna 'slug' ya fue creada
    pass


def downgrade() -> None:
    # Nada que revertir aquí
    pass