"""merge usuario branches

Revision ID: b98779a4c853
Revises: 0239e96eb189, 958f81db57a1
Create Date: 2025-11-17 03:08:09.227669

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b98779a4c853'
down_revision: Union[str, None] = ('0239e96eb189', '958f81db57a1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
