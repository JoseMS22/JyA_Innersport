"""add carrito and favoritos

Revision ID: 78a2f97d0521
Revises: 655f06a39672
Create Date: 2025-11-26 16:56:01.577190

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78a2f97d0521'
down_revision: Union[str, None] = '655f06a39672'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -----------------------
    # Tabla carrito
    # -----------------------
    op.create_table(
        "carrito",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuario.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "estado",
            sa.String(length=20),
            nullable=False,
            server_default="ABIERTO",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_carrito_usuario_id", "carrito", ["usuario_id"])
    op.create_index("ix_carrito_estado", "carrito", ["estado"])

    # -----------------------
    # Tabla carrito_item
    # -----------------------
    op.create_table(
        "carrito_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "carrito_id",
            sa.Integer(),
            sa.ForeignKey("carrito.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "variante_id",
            sa.Integer(),
            sa.ForeignKey("variante.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_carrito_item_carrito_id", "carrito_item", ["carrito_id"])
    op.create_index("ix_carrito_item_variante_id", "carrito_item", ["variante_id"])
    op.create_unique_constraint(
        "uq_carrito_item_carrito_variante",
        "carrito_item",
        ["carrito_id", "variante_id"],
    )

    # -----------------------
    # Tabla favorito
    # -----------------------
    op.create_table(
        "favorito",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuario.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "variante_id",
            sa.Integer(),
            sa.ForeignKey("variante.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_favorito_usuario_id", "favorito", ["usuario_id"])
    op.create_index("ix_favorito_variante_id", "favorito", ["variante_id"])
    op.create_unique_constraint(
        "uq_favorito_usuario_variante",
        "favorito",
        ["usuario_id", "variante_id"],
    )


def downgrade() -> None:
    # Favoritos
    op.drop_constraint(
        "uq_favorito_usuario_variante", "favorito", type_="unique"
    )
    op.drop_index("ix_favorito_variante_id", table_name="favorito")
    op.drop_index("ix_favorito_usuario_id", table_name="favorito")
    op.drop_table("favorito")

    # Items carrito
    op.drop_constraint(
        "uq_carrito_item_carrito_variante",
        "carrito_item",
        type_="unique",
    )
    op.drop_index("ix_carrito_item_variante_id", table_name="carrito_item")
    op.drop_index("ix_carrito_item_carrito_id", table_name="carrito_item")
    op.drop_table("carrito_item")

    # Carrito
    op.drop_index("ix_carrito_estado", table_name="carrito")
    op.drop_index("ix_carrito_usuario_id", table_name="carrito")
    op.drop_table("carrito")
