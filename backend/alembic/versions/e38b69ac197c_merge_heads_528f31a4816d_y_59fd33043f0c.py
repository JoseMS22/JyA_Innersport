"""merge heads 528f31a4816d y 59fd33043f0c

Revision ID: e38b69ac197c
Revises: 528f31a4816d, 59fd33043f0c
Create Date: 2025-11-29 04:57:43.506144

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e38b69ac197c'
down_revision: Union[str, None] = ('528f31a4816d', '59fd33043f0c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
