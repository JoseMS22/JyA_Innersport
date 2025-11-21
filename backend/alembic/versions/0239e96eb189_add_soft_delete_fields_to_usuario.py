"""add soft delete fields to usuario

Revision ID: 0239e96eb189
Revises: f9afa9697033
Create Date: 2025-11-14 07:04:21.631237

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0239e96eb189'
down_revision: Union[str, None] = 'f9afa9697033'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Añadir columna pendiente_eliminacion con default para no romper NOT NULL
    op.add_column(
        "usuario",
        sa.Column(
            "pendiente_eliminacion",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),  # 👈 default para las filas ya existentes
        ),
    )

    # 2) Campos de fechas para el proceso de eliminación
    op.add_column(
        "usuario",
        sa.Column(
            "eliminacion_solicitada_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "usuario",
        sa.Column(
            "eliminacion_programada_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # 3) (Opcional) Quitar el default para futuras inserciones;
    #     ya controlas el valor desde el backend.
    op.alter_column("usuario", "pendiente_eliminacion", server_default=None)


def downgrade() -> None:
    op.drop_column("usuario", "eliminacion_programada_at")
    op.drop_column("usuario", "eliminacion_solicitada_at")
    op.drop_column("usuario", "pendiente_eliminacion")
