"""merge heads

Revision ID: 4f9325793b33
Revises: 244cd1fa9d44
Create Date: 2025-12-07 04:07:25.570652

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f9325793b33'
down_revision: Union[str, None] = '244cd1fa9d44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
