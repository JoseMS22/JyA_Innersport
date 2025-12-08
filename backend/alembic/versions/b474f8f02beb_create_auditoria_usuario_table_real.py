"""create auditoria_usuario table real

Revision ID: b474f8f02beb
Revises: b382abe24393
Create Date: 2025-12-03 21:38:26.941948
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b474f8f02beb"
down_revision: Union[str, None] = "b382abe24393"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Evitar error si la tabla ya existe (caso de migraciones corridas antes)
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "auditoria_usuario" in inspector.get_table_names():
        # Ya existe la tabla (y probablemente los índices), no hacemos nada
        return

    op.create_table(
        "auditoria_usuario",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("accion", sa.String(50), nullable=False),
        sa.Column("entidad", sa.String(50), nullable=False),
        sa.Column("entidad_id", sa.Integer(), nullable=True),
        sa.Column("detalles", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column(
            "fecha",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuario.id"],
            ondelete="SET NULL",
        ),
    )

    op.create_index(
        "ix_auditoria_usuario_usuario_id",
        "auditoria_usuario",
        ["usuario_id"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_accion",
        "auditoria_usuario",
        ["accion"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_entidad",
        "auditoria_usuario",
        ["entidad"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_entidad_id",
        "auditoria_usuario",
        ["entidad_id"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_fecha",
        "auditoria_usuario",
        ["fecha"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_auditoria_usuario_fecha", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_entidad_id", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_entidad", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_accion", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_usuario_id", table_name="auditoria_usuario")
    op.drop_table("auditoria_usuario")
