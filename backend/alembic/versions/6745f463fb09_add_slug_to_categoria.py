"""add slug to categoria

Revision ID: 6745f463fb09
Revises: 655f06a39672
Create Date: 2025-11-27 23:01:32.438402
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6745f463fb09"
down_revision: Union[str, None] = "655f06a39672"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Agregar columna slug (temporalmente nullable)
    op.add_column(
        "categoria",
        sa.Column("slug", sa.String(length=200), nullable=True),
    )

    # 2) Rellenar slug para las categorías existentes, a partir del nombre
    #    Ej: "Ropa Deportiva Mujer" -> "ropa-deportiva-mujer"
    op.execute(
        """
        UPDATE categoria
        SET slug = lower(
            regexp_replace(nombre, '\\s+', '-', 'g')
        )
        """
    )

    # 3) Volver slug NOT NULL
    op.alter_column(
        "categoria",
        "slug",
        existing_type=sa.String(length=200),
        nullable=False,
    )

    # 4) Índice único sobre slug
    op.create_index(
        "ix_categoria_slug",
        "categoria",
        ["slug"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_categoria_slug", table_name="categoria")
    op.drop_column("categoria", "slug")
