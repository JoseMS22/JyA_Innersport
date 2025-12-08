"""crear_tabla_liquidaciones_comisiones

Revision ID: 6cb5f8ca116b
Revises: 20251207_comisiones
Create Date: 2025-12-07 15:07:10.042329

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6cb5f8ca116b'
down_revision: Union[str, None] = '20251207_comisiones'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        'liquidaciones_comisiones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendedor_id', sa.Integer(), nullable=False),
        sa.Column('periodo_inicio', sa.Date(), nullable=False),
        sa.Column('periodo_fin', sa.Date(), nullable=False),
        sa.Column('monto_total', sa.Numeric(10, 2), nullable=False),
        sa.Column('cantidad_ventas', sa.Integer(), nullable=False),
        sa.Column('liquidada_por', sa.Integer(), nullable=False),
        sa.Column('fecha_liquidacion', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('metodo_pago', sa.String(50), nullable=True),
        sa.Column('referencia_pago', sa.String(100), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['vendedor_id'], ['usuario.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['liquidada_por'], ['usuario.id'], ondelete='RESTRICT'),
    )
    op.create_index('ix_liquidaciones_comisiones_vendedor_id', 'liquidaciones_comisiones', ['vendedor_id'])
    op.create_index('ix_liquidaciones_comisiones_periodo_inicio', 'liquidaciones_comisiones', ['periodo_inicio'])
    op.create_index('ix_liquidaciones_comisiones_periodo_fin', 'liquidaciones_comisiones', ['periodo_fin'])


def downgrade():
    op.drop_index('ix_liquidaciones_comisiones_periodo_fin', table_name='liquidaciones_comisiones')
    op.drop_index('ix_liquidaciones_comisiones_periodo_inicio', table_name='liquidaciones_comisiones')
    op.drop_index('ix_liquidaciones_comisiones_vendedor_id', table_name='liquidaciones_comisiones')
    op.drop_table('liquidaciones_comisiones')