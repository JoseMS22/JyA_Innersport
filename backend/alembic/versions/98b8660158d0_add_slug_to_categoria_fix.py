"""add slug to categoria (fix)

Revision ID: 7a3cxxxxxx
Revises: 6745f463fb09      # 👈 deja el valor que genere Alembic
Create Date: 2025-11-27 ...
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "7a3cxxxxxx"          # el que venga en el archivo
down_revision: Union[str, None] = "6745f463fb09"  # el anterior (no toques esto)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
