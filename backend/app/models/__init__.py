# backend/app/models/__init__.py

from .usuario import Usuario
from .direccion import Direccion
from .auditoria import AuditoriaUsuario  # 🔧 AGREGAR ESTA LÍNEA
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
from .metodo_envio import MetodoEnvio
from .pedido import Pedido
from .pedido_item import PedidoItem  # 🆕 AGREGAR ESTA LÍNEA
from .pago import Pago
from .auditoria import AuditoriaUsuario
from .caja_movimientos import CajaMovimiento
from .caja_turno import CajaTurno
from .usuario_sucursal import UsuarioSucursal
from .venta_pos import VentaPOS
from .venta_pos_item import VentaPOSItem
from .pago_pos import PagoPOS

__all__ = [
    "Usuario",
    "Direccion",
    "AuditoriaUsuario",  # Ya estaba en __all__, solo faltaba importarlo arriba
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
    "PedidoItem",  # 🆕 AGREGAR ESTA LÍNEA
    "Pago",
]