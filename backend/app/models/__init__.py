# backend/app/models/__init__.py

from .usuario import Usuario
from .direccion import Direccion
from .categoria import Categoria
from .producto import Producto
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
from .pedido import Pedido
from .pago import Pago
from .auditoria import AuditoriaUsuario

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
    "MetodoEnvio",
    "Pedido",
    "Pago",
]