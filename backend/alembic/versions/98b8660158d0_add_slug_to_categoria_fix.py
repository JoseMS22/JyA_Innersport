"""empty migration to avoid duplicate slug creation"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "7a3cxxxxxx"   # usa el revision ID real que está en tu archivo
down_revision: Union[str, None] = "6745f463fb09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Esta migración queda vacía porque 'slug' ya fue creada previamente
    pass


def downgrade() -> None:
    pass
