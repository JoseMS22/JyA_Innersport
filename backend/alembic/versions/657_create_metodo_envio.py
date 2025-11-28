"""create metodo_envio table

Revision ID: 657_create_metodo_envio
Revises: 656_add_direccion_fields
Create Date: 2025-11-27 21:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '657_create_metodo_envio'
down_revision: Union[str, None] = '656_add_direccion_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Crea la tabla metodo_envio y agrega datos iniciales.
    """
    
    # Verificar si la tabla ya existe
    from sqlalchemy import inspect
    from app.db import engine
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if 'metodo_envio' in existing_tables:
        print("⚠️  Tabla 'metodo_envio' ya existe, saltando creación")
        return
    
    # Crear tabla
    op.create_table(
        'metodo_envio',
        sa.Column('id', sa.Integer(), nullable=False),
        
        # Información básica
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('descripcion', sa.String(length=500), nullable=True),
        
        # Costos
        sa.Column('costo_base', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('costo_por_km', sa.Numeric(precision=10, scale=2), nullable=True),
        
        # Tiempos de entrega
        sa.Column('dias_entrega_min', sa.Integer(), nullable=False),
        sa.Column('dias_entrega_max', sa.Integer(), nullable=False),
        
        # Disponibilidad
        sa.Column('provincias_disponibles', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true()),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    print("✅ Tabla 'metodo_envio' creada")
    
    # Crear índices
    op.create_index('ix_metodo_envio_id', 'metodo_envio', ['id'], unique=False)
    op.create_index('ix_metodo_envio_activo', 'metodo_envio', ['activo'], unique=False)
    
    print("✅ Índices creados")
    
    # Insertar métodos de envío por defecto
    op.execute("""
        INSERT INTO metodo_envio 
        (nombre, descripcion, costo_base, costo_por_km, dias_entrega_min, dias_entrega_max, activo)
        VALUES 
            ('Envío Estándar', 'Entrega en 5-7 días hábiles', 3500, 10, 5, 7, TRUE),
            ('Envío Express', 'Entrega en 2-3 días hábiles', 5500, 15, 2, 3, TRUE),
            ('Envío Mismo Día', 'Entrega el mismo día (solo GAM)', 8000, 0, 1, 1, TRUE)
    """)
    
    print("✅ Métodos de envío por defecto insertados")
    
    # Configurar disponibilidad del Envío Mismo Día solo para GAM
    op.execute("""
        UPDATE metodo_envio 
        SET provincias_disponibles = ARRAY['San José', 'Alajuela', 'Heredia', 'Cartago']
        WHERE nombre = 'Envío Mismo Día'
    """)
    
    print("✅ Disponibilidad configurada")
    print("=" * 60)
    print("✅ Migración completada exitosamente")
    print("=" * 60)


def downgrade() -> None:
    """Elimina la tabla metodo_envio."""
    op.drop_index('ix_metodo_envio_activo', table_name='metodo_envio')
    op.drop_index('ix_metodo_envio_id', table_name='metodo_envio')
    op.drop_table('metodo_envio')
    
    print("❌ Tabla 'metodo_envio' eliminada")