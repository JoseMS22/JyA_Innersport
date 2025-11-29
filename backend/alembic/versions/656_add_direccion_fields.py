"""add missing fields to direccion

Revision ID: 656_add_direccion_fields
Revises: 655f06a39672
Create Date: 2025-11-27 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '656_add_direccion_fields'
down_revision: Union[str, None] = '655f06a39672'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Agrega todas las columnas faltantes a la tabla direccion.
    """
    
    # 1. Verificar si las columnas ya existen antes de agregarlas
    from sqlalchemy import inspect
    from app.db import engine
    
    inspector = inspect(engine)
    existing_columns = [col['name'] for col in inspector.get_columns('direccion')]
    
    # 2. Agregar columna 'nombre' si no existe
    if 'nombre' not in existing_columns:
        op.add_column('direccion', 
            sa.Column('nombre', sa.String(length=100), nullable=True)
        )
        print("✅ Columna 'nombre' agregada")
    
    # 3. Agregar columna 'pais' si no existe
    if 'pais' not in existing_columns:
        op.add_column('direccion',
            sa.Column('pais', sa.String(length=80), nullable=False, server_default='Costa Rica')
        )
        op.alter_column('direccion', 'pais', server_default=None)
        print("✅ Columna 'pais' agregada")
    
    # 4. Agregar columna 'codigo_postal' si no existe
    if 'codigo_postal' not in existing_columns:
        op.add_column('direccion',
            sa.Column('codigo_postal', sa.String(length=20), nullable=True)
        )
        print("✅ Columna 'codigo_postal' agregada")
    
    # 5. Agregar columna 'referencia' si no existe
    if 'referencia' not in existing_columns:
        op.add_column('direccion',
            sa.Column('referencia', sa.String(length=200), nullable=True)
        )
        print("✅ Columna 'referencia' agregada")
    
    # 6. Agregar columna 'predeterminada' si no existe
    if 'predeterminada' not in existing_columns:
        # Primero nullable
        op.add_column('direccion',
            sa.Column('predeterminada', sa.Boolean(), nullable=True)
        )
        
        # Marcar la primera dirección de cada usuario como predeterminada
        op.execute("""
            UPDATE direccion SET predeterminada = (
                direccion.id = (
                    SELECT MIN(d2.id) 
                    FROM direccion d2 
                    WHERE d2.usuario_id = direccion.usuario_id
                )
            )
            WHERE predeterminada IS NULL
        """)
        
        # Hacer NOT NULL
        op.alter_column('direccion', 'predeterminada',
                        existing_type=sa.Boolean(),
                        nullable=False,
                        server_default=sa.false())
        op.alter_column('direccion', 'predeterminada', server_default=None)
        print("✅ Columna 'predeterminada' agregada")
    
    # 7. Agregar columna 'activa' si no existe
    if 'activa' not in existing_columns:
        # Primero nullable
        op.add_column('direccion',
            sa.Column('activa', sa.Boolean(), nullable=True)
        )
        
        # Marcar todas como activas
        op.execute("UPDATE direccion SET activa = TRUE WHERE activa IS NULL")
        
        # Hacer NOT NULL
        op.alter_column('direccion', 'activa',
                        existing_type=sa.Boolean(),
                        nullable=False,
                        server_default=sa.true())
        op.alter_column('direccion', 'activa', server_default=None)
        print("✅ Columna 'activa' agregada")
    
    # 8. Agregar columna 'updated_at' si no existe
    if 'updated_at' not in existing_columns:
        op.add_column('direccion',
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True)
        )
        print("✅ Columna 'updated_at' agregada")
    
    # 9. Crear índices si no existen
    try:
        op.create_index(
            'ix_direccion_usuario_predeterminada',
            'direccion',
            ['usuario_id', 'predeterminada'],
            unique=False
        )
        print("✅ Índice 'ix_direccion_usuario_predeterminada' creado")
    except:
        pass  # Ya existe
    
    try:
        op.create_index(
            'ix_direccion_usuario_activa',
            'direccion',
            ['usuario_id', 'activa'],
            unique=False
        )
        print("✅ Índice 'ix_direccion_usuario_activa' creado")
    except:
        pass  # Ya existe
    
    print("=" * 60)
    print("✅ Migración completada exitosamente")
    print("=" * 60)


def downgrade() -> None:
    """Revierte los cambios."""
    # Eliminar índices
    try:
        op.drop_index('ix_direccion_usuario_activa', table_name='direccion')
    except:
        pass
    
    try:
        op.drop_index('ix_direccion_usuario_predeterminada', table_name='direccion')
    except:
        pass
    
    # Eliminar columnas
    for col in ['updated_at', 'activa', 'predeterminada', 'referencia', 
                'codigo_postal', 'pais', 'nombre']:
        try:
            op.drop_column('direccion', col)
        except:
            pass
    
    print("❌ Cambios revertidos")