# backend/app/models/__init__.py

from .producto_categoria import ProductoCategoria
from .media import Media
from .variante import Variante
from .historial_precio import HistorialPrecio
from .sucursal import Sucursal
from .inventario import Inventario
from .movimiento_inventario import MovimientoInventario
from .categoria_relacion import categoria_categoria  # si quieres exponerla
from .home_hero import HomeHeroConfig  # noqa
from .favoritos import Favorito
from .carrito import Carrito, CarritoItem
from .programa_puntos import (
    ProgramaPuntosConfig,
    SaldoPuntosUsuario,
    MovimientoPuntosUsuario,
)
from .metodo_envio import MetodoEnvio  # 🆕 NUEVO

__all__ = [
    "Usuario",
    "Direccion",
    "AuditoriaUsuario",
    "Categoria",
    "Producto",
    "ProductoCategoria",
    "Media",
    "Variante",
    "HistorialPrecio",
    "Sucursal",
    "Inventario",
    "MovimientoInventario",
    "categoria_categoria",
    "HomeHeroConfig",
    "Favorito",
    "Carrito",
    "CarritoItem",
    "ProgramaPuntosConfig",
    "SaldoPuntosUsuario",
    "MovimientoPuntosUsuario",
    "MetodoEnvio",  # 🆕 NUEVO
]