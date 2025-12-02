"""merge multiple heads

Revision ID: 129266c307e1
Revises: 5d8014a33ca3, d3444cd9751b
Create Date: 2025-12-01 02:59:35.852642

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '129266c307e1'
down_revision: Union[str, None] = ('5d8014a33ca3', 'd3444cd9751b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
