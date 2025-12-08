"""add impuesto to pedido_item and impuesto_total to pedido

Revision ID: 8336a756901c
Revises: 9e14402cd8bf
Create Date: 2025-12-05 23:11:51.840676

"""
from alembic import op
import sqlalchemy as sa
from decimal import Decimal

# revision identifiers, used by Alembic.
revision = '8336a756901c'
down_revision = '9e14402cd8bf'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar impuesto a pedido_item con valor por defecto temporal
    op.add_column(
        'pedido_item', 
        sa.Column('impuesto', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00')
    )
    
    # Calcular impuesto para registros existentes
    # Asumiendo IVA del 13% incluido en el precio
    op.execute("""
        UPDATE pedido_item 
        SET impuesto = ROUND(subtotal * 0.13 / 1.13, 2)
        WHERE impuesto = 0.00
    """)
    
    # Remover el valor por defecto
    op.alter_column('pedido_item', 'impuesto', server_default=None)
    
    # Agregar impuesto_total a pedido (este puede ser nullable o con default)
    op.add_column(
        'pedido', 
        sa.Column('impuesto_total', sa.Numeric(precision=10, scale=2), nullable=True, server_default='0.00')
    )
    
    # Calcular impuesto_total para pedidos existentes
    op.execute("""
        UPDATE pedido 
        SET impuesto_total = (
            SELECT COALESCE(SUM(impuesto), 0) 
            FROM pedido_item 
            WHERE pedido_item.pedido_id = pedido.id
        )
    """)


def downgrade():
    op.drop_column('pedido', 'impuesto_total')
    op.drop_column('pedido_item', 'impuesto')