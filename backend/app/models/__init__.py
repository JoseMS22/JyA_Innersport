# backend/app/models/__init__.py

from .usuario import Usuario
from .direccion import Direccion
from .auditoria import AuditoriaUsuario
from .categoria import Categoria
from .producto import Producto
from .producto_categoria import ProductoCategoria
from .media import Media
from .variante import Variante
from .historial_precio import HistorialPrecio
from .sucursal import Sucursal
from .inventario import Inventario
from .movimiento_inventario import MovimientoInventario
from .categoria_relacion import categoria_categoria
from .home_hero import HomeHeroConfig
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
    "MetodoEnvio",  # 🆕 NUEVO
]