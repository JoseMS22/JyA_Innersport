"""add marca to variante

Revision ID: abc123marca001
Revises: 54aeea7b0035
Create Date: 2025-11-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123marca001'
down_revision: Union[str, None] = '54aeea7b0035'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Añadir columna marca a la tabla variante
    op.add_column('variante', 
        sa.Column('marca', sa.String(length=100), nullable=True)
    )
    
    # Crear índice para mejorar búsquedas por marca
    op.create_index(
        'ix_variante_marca', 
        'variante', 
        ['marca'], 
        unique=False
    )


def downgrade() -> None:
    # Eliminar índice
    op.drop_index('ix_variante_marca', table_name='variante')
    
    # Eliminar columna
    op.drop_column('variante', 'marca')