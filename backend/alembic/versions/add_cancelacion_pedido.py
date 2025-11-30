"""add cancelacion to pedido

Revision ID: add_cancelacion_pedido
Revises: 3e63549241d2
Create Date: 2025-11-29 18:21:14.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_cancelacion_pedido'
down_revision: Union[str, None] = 'feb7c5922cf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agregar campos para cancelación de pedidos
    op.add_column('pedido', sa.Column('cancelado', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('pedido', sa.Column('motivo_cancelacion', sa.Text(), nullable=True))
    op.add_column('pedido', sa.Column('fecha_cancelacion', sa.DateTime(timezone=True), nullable=True))
    op.add_column('pedido', sa.Column('cancelado_por_id', sa.Integer(), nullable=True))
    
    # Agregar índices
    op.create_index(op.f('ix_pedido_cancelado'), 'pedido', ['cancelado'], unique=False)
    op.create_index(op.f('ix_pedido_cancelado_por_id'), 'pedido', ['cancelado_por_id'], unique=False)
    
    # Agregar foreign key para cancelado_por
    op.create_foreign_key(
        'fk_pedido_cancelado_por',
        'pedido', 'usuario',
        ['cancelado_por_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Eliminar foreign key
    op.drop_constraint('fk_pedido_cancelado_por', 'pedido', type_='foreignkey')
    
    # Eliminar índices
    op.drop_index(op.f('ix_pedido_cancelado_por_id'), table_name='pedido')
    op.drop_index(op.f('ix_pedido_cancelado'), table_name='pedido')
    
    # Eliminar columnas
    op.drop_column('pedido', 'cancelado_por_id')
    op.drop_column('pedido', 'fecha_cancelacion')
    op.drop_column('pedido', 'motivo_cancelacion')
    op.drop_column('pedido', 'cancelado')