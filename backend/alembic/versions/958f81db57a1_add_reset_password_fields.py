"""add reset password fields

Revision ID: 958f81db57a1
Revises: f9afa9697033
Create Date: [fecha]
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '958f81db57a1'
down_revision: Union[str, None] = 'f9afa9697033'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1️⃣ Agregar columnas que pueden ser NULL primero
    op.add_column('usuario', 
        sa.Column('reset_password_token', sa.String(length=255), nullable=True)
    )
    op.add_column('usuario', 
        sa.Column('reset_password_token_expira', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column('usuario', 
        sa.Column('ultimo_intento_reset', sa.DateTime(timezone=True), nullable=True)
    )
    
    # 2️⃣ Agregar columna NOT NULL con valor por defecto
    op.add_column('usuario', 
        sa.Column('reset_password_attempts', sa.Integer(), nullable=True)  # Primero nullable
    )
    
    # 3️⃣ Actualizar registros existentes con valor por defecto
    op.execute("UPDATE usuario SET reset_password_attempts = 0 WHERE reset_password_attempts IS NULL")
    
    # 4️⃣ Ahora sí, hacer la columna NOT NULL
    op.alter_column('usuario', 'reset_password_attempts',
                    existing_type=sa.Integer(),
                    nullable=False)
    
    # 5️⃣ Crear índice para búsqueda rápida por token
    op.create_index(
        'ix_usuario_reset_password_token', 
        'usuario', 
        ['reset_password_token'], 
        unique=False
    )


def downgrade() -> None:
    # Eliminar índice
    op.drop_index('ix_usuario_reset_password_token', table_name='usuario')
    
    # Eliminar columnas
    op.drop_column('usuario', 'ultimo_intento_reset')
    op.drop_column('usuario', 'reset_password_attempts')
    op.drop_column('usuario', 'reset_password_token_expira')
    op.drop_column('usuario', 'reset_password_token')