"""ajustar rma para pos

Revision ID: 5c32713ee355
Revises: d61f68fac393
Create Date: 2025-12-08 04:19:21.065587
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5c32713ee355"
down_revision: Union[str, None] = "d61f68fac393"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # -------- rmas --------
    cols_rmas = [c["name"] for c in inspector.get_columns("rmas")]

    # pedido_id: hacerlo nullable (si no lo era, no pasa nada si ya lo es)
    op.alter_column(
        "rmas",
        "pedido_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # venta_pos_id: solo si NO existe aún
    if "venta_pos_id" not in cols_rmas:
        op.add_column(
            "rmas",
            sa.Column("venta_pos_id", sa.Integer(), nullable=True),
        )
        op.create_index(
            "ix_rmas_venta_pos_id",
            "rmas",
            ["venta_pos_id"],
            unique=False,
        )
        op.create_foreign_key(
            "fk_rmas_venta_pos",
            "rmas",
            "venta_pos",
            ["venta_pos_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # evidencia_url: solo si NO existe (para evitar el error que te salió)
    if "evidencia_url" not in cols_rmas:
        op.add_column(
            "rmas",
            sa.Column("evidencia_url", sa.String(), nullable=True),
        )

    # -------- rma_items --------
    cols_rma_items = [c["name"] for c in inspector.get_columns("rma_items")]

    # pedido_item_id: hacerlo nullable
    op.alter_column(
        "rma_items",
        "pedido_item_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # venta_pos_item_id: solo si NO existe aún
    if "venta_pos_item_id" not in cols_rma_items:
        op.add_column(
            "rma_items",
            sa.Column("venta_pos_item_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_rma_items_venta_pos_item",
            "rma_items",
            "venta_pos_item",
            ["venta_pos_item_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    # ⚠️ Downgrade "simple". Probablemente nunca lo uses, pero lo dejamos consistente.

    # rma_items: quitar FK y columna venta_pos_item_id y volver pedido_item_id a NOT NULL
    op.drop_constraint(
        "fk_rma_items_venta_pos_item",
        "rma_items",
        type_="foreignkey",
    )
    op.drop_column("rma_items", "venta_pos_item_id")
    op.alter_column(
        "rma_items",
        "pedido_item_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    # rmas: quitar FK, índice, columna venta_pos_id y evidencia_url, y volver pedido_id a NOT NULL
    op.drop_constraint(
        "fk_rmas_venta_pos",
        "rmas",
        type_="foreignkey",
    )
    op.drop_index("ix_rmas_venta_pos_id", table_name="rmas")
    op.drop_column("rmas", "venta_pos_id")
    op.drop_column("rmas", "evidencia_url")
    op.alter_column(
        "rmas",
        "pedido_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
