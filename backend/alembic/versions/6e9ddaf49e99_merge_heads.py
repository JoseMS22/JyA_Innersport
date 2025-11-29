"""merge heads

Revision ID: 6e9ddaf49e99
Revises: 59fd33043f0c, 7a3cxxxxxx
Create Date: 2025-11-29 15:56:46.248135

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e9ddaf49e99'
down_revision: Union[str, None] = ('59fd33043f0c', '7a3cxxxxxx')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
