"""merge heads

Revision ID: 244cd1fa9d44
Revises: 8336a756901c, a324e1b56115
Create Date: 2025-12-06 03:35:02.991475

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '244cd1fa9d44'
down_revision: Union[str, None] = ('8336a756901c', 'a324e1b56115')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
