from decimal import Decimal
from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, EmailStr


# ============================
# CAJA
# ============================

class CajaAbrirRequest(BaseModel):
    monto_apertura: Decimal = Field(..., ge=0)


class CajaTurnoOut(BaseModel):
    id: int
    usuario_id: int
    monto_apertura: Decimal
    monto_teorico_cierre: Optional[Decimal] = None
    monto_real_cierre: Optional[Decimal] = None
    diferencia: Optional[Decimal] = None
    estado: Literal["ABIERTA", "CERRADA"]
    observaciones: Optional[str] = None
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CajaCerrarRequest(BaseModel):
    monto_real_cierre: Decimal = Field(..., ge=0)
    observaciones: Optional[str] = None


class CajaCerrarResponse(BaseModel):
    id: int
    monto_apertura: Decimal
    monto_teorico_cierre: Decimal
    monto_real_cierre: Decimal
    diferencia: Decimal
    estado: Literal["CERRADA"]
    observaciones: Optional[str] = None
    fecha_apertura: datetime
    fecha_cierre: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================
# CONFIG POS
# ============================

class SucursalPOSOut(BaseModel):
    id: int
    nombre: str
    activo: bool
    provincia: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class POSConfigOut(BaseModel):
    usuario_id: int
    nombre_usuario: str
    rol: str
    sucursales: List[SucursalPOSOut]
    caja_actual: Optional[CajaTurnoOut] = None


# ============================
# VENTAS POS
# ============================

class POSVentaItemIn(BaseModel):
    variante_id: int
    producto_id: int
    cantidad: int = Field(..., gt=0)
    precio_unitario: Decimal = Field(..., ge=0)


class POSPagoIn(BaseModel):
    metodo: Literal["EFECTIVO", "TARJETA", "SINPE", "OTRO"]
    monto: Decimal = Field(..., gt=0)


class POSVentaCreate(BaseModel):
    sucursal_id: int

    # Cliente opcional
    cliente_id: Optional[int] = None
    usar_cliente_mostrador: bool = False

    # Nombre que se verá en el ticket:
    # - si cliente registrado: se puede sobrescribir
    # - si mostrador: "Anónimo" por defecto si viene vacío
    nombre_cliente: Optional[str] = None

    items: List[POSVentaItemIn]
    puntos_a_usar: int = 0
    pagos: List[POSPagoIn]


class POSVentaItemOut(BaseModel):
    variante_id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class POSVentaOut(BaseModel):
    id: int
    sucursal_id: int
    vendedor_id: int
    cliente_id: Optional[int] = None
    nombre_cliente: Optional[str] = None

    subtotal: Decimal
    descuento_puntos: Decimal
    impuesto: Decimal
    total: Decimal
    puntos_ganados: int

    estado: str
    fecha_creacion: datetime

    items: List[POSVentaItemOut]

    model_config = ConfigDict(from_attributes=True)


# ============================
# VENTAS POS – Salidas (para listado y detalle)
# ============================

class POSVentaItemOut(BaseModel):
    id: int
    variante_id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class POSPagoPOSOut(BaseModel):
    id: int
    metodo: Literal["EFECTIVO", "TARJETA", "SINPE", "OTRO"]
    monto: Decimal
    referencia: Optional[str] = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


class POSVentaListItemOut(BaseModel):
    id: int
    sucursal_id: int
    sucursal_nombre: str
    impuesto: Decimal
    total: Decimal
    estado: str
    fecha_creacion: datetime
    metodo_principal: str
    nombre_cliente_ticket: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class POSVentaDetailOut(BaseModel):
    id: int
    sucursal_id: int
    sucursal_nombre: str

    vendedor_id: int
    vendedor_nombre: str

    cliente_id: Optional[int] = None
    nombre_cliente_ticket: Optional[str] = None

    subtotal: Decimal
    descuento_puntos: Decimal
    impuesto: Decimal
    total: Decimal
    puntos_ganados: int

    estado: str
    fecha_creacion: datetime

    items: List[POSVentaItemOut]
    pagos: List[POSPagoPOSOut]

    model_config = ConfigDict(from_attributes=True)


class POSProductoOut(BaseModel):
    variante_id: int
    producto_id: int
    nombre: str
    precio: Decimal
    sku: str
    sucursal_id: int
    stock: int
    imagen_url: Optional[str] = None

    # 👇 NUEVO
    color: Optional[str] = None
    talla: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class POSVentaEstadoUpdate(BaseModel):
    """
    Payload de entrada para cambiar el estado de una venta POS.
    """
    estado: Literal[
        "PAGADO",
        "ENTREGADO",
        "CANCELADO",
    ]


class POSVentaEstadoResponse(BaseModel):
    """
    Respuesta simplificada cuando se actualiza el estado de una venta POS.
    """
    id: int
    estado: str
    fecha_actualizacion: datetime


# ==== CLIENTES POS ====

class POSClienteCreate(BaseModel):
    """
    Cliente creado desde el POS por un vendedor.
    No requiere dirección, solo datos básicos y contraseña.
    """
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None
    password: str
    confirm_password: str


class POSClientePublic(BaseModel):
    """
    Datos públicos mínimos de un cliente para POS.
    """
    id: int
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class POSClienteSearchItem(BaseModel):
    """
    Item devuelto al buscar clientes por correo en el POS.
    """
    id: int
    nombre: str
    correo: EmailStr
    telefono: Optional[str] = None
    puntos_actuales: int = 0   # tomado de SaldoPuntosUsuario si existe

    model_config = ConfigDict(from_attributes=True)
