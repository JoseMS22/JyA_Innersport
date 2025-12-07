"""merge heads

Revision ID: b382abe24393
Revises: 6e9ddaf49e99, a73a44bcea87
Create Date: 2025-12-03 20:06:36.614348

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b382abe24393'
down_revision: Union[str, None] = ('6e9ddaf49e99', 'a73a44bcea87')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
