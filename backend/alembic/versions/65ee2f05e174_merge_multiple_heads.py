"""merge multiple heads

Revision ID: 65ee2f05e174
Revises: a73a44bcea87, 6e9ddaf49e99
Create Date: 2025-12-04 18:32:27.808559

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65ee2f05e174'
down_revision: Union[str, None] = ('a73a44bcea87', '6e9ddaf49e99')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
