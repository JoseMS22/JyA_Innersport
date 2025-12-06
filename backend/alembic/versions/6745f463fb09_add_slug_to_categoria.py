"""add slug to categoria

Revision ID: 6745f463fb09
Revises: 655f06a39672
Create Date: 2025-11-27 23:01:32.438402
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6745f463fb09"
down_revision: Union[str, None] = "655f06a39672"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
