"""crear_tablas_comisiones

Revision ID: 20251207_comisiones
Revises: 8336a756901c
Create Date: 2025-12-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251207_comisiones'
down_revision: Union[str, None] = '8336a756901c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ========== TABLA: configuracion_comision ==========
    op.create_table(
        'configuracion_comision',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tipo_venta', sa.String(20), nullable=False),
        sa.Column('porcentaje', sa.Numeric(5, 2), nullable=False),
        sa.Column('monto_minimo', sa.Numeric(10, 2), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('fecha_creacion', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('fecha_actualizacion', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tipo_venta', name='uq_configuracion_tipo_venta')
    )
    
    # ========== TABLA: comisiones_vendedor ==========
    op.create_table(
        'comisiones_vendedor',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendedor_id', sa.Integer(), nullable=False),
        sa.Column('venta_pos_id', sa.Integer(), nullable=True),
        sa.Column('pedido_id', sa.Integer(), nullable=True),
        sa.Column('tipo_venta', sa.String(20), nullable=False),
        sa.Column('monto_venta', sa.Numeric(10, 2), nullable=False),
        sa.Column('porcentaje_aplicado', sa.Numeric(5, 2), nullable=False),
        sa.Column('monto_comision', sa.Numeric(10, 2), nullable=False),
        sa.Column('estado', sa.String(20), nullable=False, server_default='PENDIENTE'),
        sa.Column('fecha_venta', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fecha_liquidacion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('liquidacion_id', sa.Integer(), nullable=True),
        sa.Column('liquidado_por_id', sa.Integer(), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['vendedor_id'], ['usuario.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['venta_pos_id'], ['venta_pos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pedido_id'], ['pedido.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['liquidado_por_id'], ['usuario.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_comisiones_vendedor_id', 'comisiones_vendedor', ['vendedor_id'])
    op.create_index('ix_comisiones_estado', 'comisiones_vendedor', ['estado'])
    op.create_index('ix_comisiones_fecha_venta', 'comisiones_vendedor', ['fecha_venta'])
    
    # ========== TABLA: liquidacion_comision ==========
    op.create_table(
        'liquidacion_comision',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendedor_id', sa.Integer(), nullable=False),
        sa.Column('periodo_inicio', sa.DateTime(timezone=True), nullable=False),
        sa.Column('periodo_fin', sa.DateTime(timezone=True), nullable=False),
        sa.Column('monto_total', sa.Numeric(10, 2), nullable=False),
        sa.Column('cantidad_ventas', sa.Integer(), nullable=False),
        sa.Column('metodo_pago', sa.String(20), nullable=False),
        sa.Column('referencia_pago', sa.String(100), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('fecha_liquidacion', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('liquidado_por_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['vendedor_id'], ['usuario.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['liquidado_por_id'], ['usuario.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_liquidacion_vendedor', 'liquidacion_comision', ['vendedor_id'])
    op.create_index('ix_liquidacion_fecha', 'liquidacion_comision', ['fecha_liquidacion'])


def downgrade() -> None:
    # Eliminar índices
    op.drop_index('ix_liquidacion_fecha', table_name='liquidacion_comision')
    op.drop_index('ix_liquidacion_vendedor', table_name='liquidacion_comision')
    op.drop_table('liquidacion_comision')
    
    op.drop_index('ix_comisiones_fecha_venta', table_name='comisiones_vendedor')
    op.drop_index('ix_comisiones_estado', table_name='comisiones_vendedor')
    op.drop_index('ix_comisiones_vendedor_id', table_name='comisiones_vendedor')
    op.drop_table('comisiones_vendedor')
    
    op.drop_table('configuracion_comision')