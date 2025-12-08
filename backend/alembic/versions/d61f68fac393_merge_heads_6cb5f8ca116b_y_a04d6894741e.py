"""merge heads 6cb5f8ca116b y a04d6894741e

Revision ID: d61f68fac393
Revises: 6cb5f8ca116b, a04d6894741e
Create Date: 2025-12-08 02:19:03.445416

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd61f68fac393'
down_revision: Union[str, None] = ('6cb5f8ca116b', 'a04d6894741e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
