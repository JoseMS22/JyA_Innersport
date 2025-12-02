"""recrear auditoria_usuario

Revision ID: 45441ff363fc
Revises: 27c763ee3a6d
Create Date: 2025-11-29 XX:XX:XX.XXXXXX
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "45441ff363fc"        # <-- deja el que generó Alembic
down_revision: Union[str, None] = "27c763ee3a6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Volvemos a crear la tabla de auditoría de usuario
    op.create_table(
        "auditoria_usuario",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column("accion", sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column("entidad", sa.VARCHAR(length=50), autoincrement=False, nullable=False),
        sa.Column("entidad_id", sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column("detalles", sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column("ip_address", sa.VARCHAR(length=45), autoincrement=False, nullable=True),
        sa.Column(
            "fecha",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            autoincrement=False,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuario.id"],
            name="auditoria_usuario_usuario_id_fkey",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="auditoria_usuario_pkey"),
    )
    op.create_index(
        "ix_auditoria_usuario_usuario_id",
        "auditoria_usuario",
        ["usuario_id"],
        unique=False,
    )
    op.create_index("ix_auditoria_usuario_id", "auditoria_usuario", ["id"], unique=False)
    op.create_index(
        "ix_auditoria_usuario_fecha",
        "auditoria_usuario",
        ["fecha"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_entidad_id",
        "auditoria_usuario",
        ["entidad_id"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_entidad",
        "auditoria_usuario",
        ["entidad"],
        unique=False,
    )
    op.create_index(
        "ix_auditoria_usuario_accion",
        "auditoria_usuario",
        ["accion"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_auditoria_usuario_accion", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_entidad", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_entidad_id", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_fecha", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_id", table_name="auditoria_usuario")
    op.drop_index("ix_auditoria_usuario_usuario_id", table_name="auditoria_usuario")
    op.drop_table("auditoria_usuario")