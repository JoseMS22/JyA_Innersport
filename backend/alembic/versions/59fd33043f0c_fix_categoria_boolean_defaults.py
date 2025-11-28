"""fix_categoria_boolean_defaults

Revision ID: 59fd33043f0c
Revises: 657_create_metodo_envio
Create Date: 2025-11-28 03:08:22.457142

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59fd33043f0c'
down_revision: Union[str, None] = '657_create_metodo_envio'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Arreglar valores NULL en campos boolean de categoria."""
    
    # 1. Actualizar registros existentes con NULL a False
    op.execute("""
        UPDATE categoria 
        SET principal = FALSE 
        WHERE principal IS NULL
    """)
    
    op.execute("""
        UPDATE categoria 
        SET secundaria = FALSE 
        WHERE secundaria IS NULL
    """)
    
    # 2. Hacer las columnas NOT NULL con valores por defecto
    op.alter_column('categoria', 'principal',
                    existing_type=sa.Boolean(),
                    nullable=False,
                    server_default=sa.false())
    
    op.alter_column('categoria', 'secundaria',
                    existing_type=sa.Boolean(),
                    nullable=False,
                    server_default=sa.false())
    
    # 3. Remover el server_default para futuras inserciones
    op.alter_column('categoria', 'principal', server_default=None)
    op.alter_column('categoria', 'secundaria', server_default=None)
    
    print("✅ Columnas principal y secundaria corregidas")


def downgrade() -> None:
    """Revertir cambios."""
    # Hacer las columnas nullable de nuevo
    op.alter_column('categoria', 'principal',
                    existing_type=sa.Boolean(),
                    nullable=True)
    
    op.alter_column('categoria', 'secundaria',
                    existing_type=sa.Boolean(),
                    nullable=True)