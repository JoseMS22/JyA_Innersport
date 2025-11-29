"""merge heads auditoria + carrito

Revision ID: feb7c5922cf8
Revises: 3e63549241d2, XXXXXXXXXXXX
Create Date: 2025-11-29 05:55:36.009028

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'feb7c5922cf8'
down_revision: Union[str, None] = ('3e63549241d2', 'XXXXXXXXXXXX')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
