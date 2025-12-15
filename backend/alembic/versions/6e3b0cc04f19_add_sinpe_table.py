"""add sinpe table

Revision ID: 6e3b0cc04f19
Revises: 5c32713ee355
Create Date: 2025-12-14 01:53:32.834027

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6e3b0cc04f19'
down_revision: Union[str, None] = '5c32713ee355'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sinpe',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pedido_id', sa.Integer(), nullable=False),
        sa.Column('numero_destino', sa.String(length=30), nullable=False),
        sa.Column('imagen_url', sa.String(length=255), nullable=False),
        sa.Column('referencia', sa.String(length=100), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['pedido_id'], ['pedido.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('pedido_id', name='uq_sinpe_pedido')
    )
    op.create_index(op.f('ix_sinpe_id'), 'sinpe', ['id'], unique=False)
    op.create_index(op.f('ix_sinpe_pedido_id'), 'sinpe', ['pedido_id'], unique=False)



def downgrade() -> None:
    op.drop_index(op.f('ix_sinpe_pedido_id'), table_name='sinpe')
    op.drop_index(op.f('ix_sinpe_id'), table_name='sinpe')
    op.drop_table('sinpe')
