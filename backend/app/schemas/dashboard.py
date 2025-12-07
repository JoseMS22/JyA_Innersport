# backend/app/schemas/dashboard.py
from datetime import datetime, date
from typing import Optional, List, Dict
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


# ============================
# DASHBOARD MÉTRICAS
# ============================

class VentasTotalesMetrica(BaseModel):
    monto: Decimal
    cantidad: int
    variacion_porcentual: Optional[Decimal] = None


class PedidosActivosMetrica(BaseModel):
    total: int
    por_estado: Dict[str, int]


class VentasPorCanal(BaseModel):
    POS: Decimal = Decimal("0.00")
    ONLINE: Decimal = Decimal("0.00")


class MetricasDashboard(BaseModel):
    ventas_totales: VentasTotalesMetrica
    pedidos_activos: PedidosActivosMetrica
    ticket_promedio: Decimal
    ventas_por_canal: VentasPorCanal
    ultima_actualizacion: datetime


# ============================
# PRODUCTOS TOP
# ============================

class VariantePopular(BaseModel):
    variante_id: int
    talla: Optional[str] = None
    color: Optional[str] = None
    cantidad: int


class ProductoTop(BaseModel):
    producto_id: int
    nombre: str
    cantidad_vendida: int
    monto_total: Decimal
    variantes_populares: List[VariantePopular]


class ProductosTopResponse(BaseModel):
    productos: List[ProductoTop]


# ============================
# ALERTAS INVENTARIO
# ============================

class AlertaInventario(BaseModel):
    variante_id: int
    producto_nombre: str
    talla: Optional[str] = None
    color: Optional[str] = None
    sucursal_id: int
    sucursal_nombre: str
    stock_actual: int
    stock_minimo: int
    nivel_alerta: str  # 'CRITICO', 'BAJO', 'MEDIO'


class AlertasInventarioResponse(BaseModel):
    alertas: List[AlertaInventario]
    total_alertas: int


# ============================
# DESEMPEÑO VENDEDORES
# ============================

class DesempenoVendedor(BaseModel):
    vendedor_id: int
    nombre: str
    ventas_totales: Decimal
    cantidad_ventas: int
    ticket_promedio: Decimal
    comisiones_generadas: Decimal
    comisiones_pendientes: Decimal
    comisiones_liquidadas: Decimal
    ranking: int


class DesempenoVendedoresResponse(BaseModel):
    vendedores: List[DesempenoVendedor]


# ============================
# COMISIONES
# ============================

class ConfiguracionComisionBase(BaseModel):
    tipo_venta: str
    porcentaje_comision: Decimal
    monto_minimo: Decimal
    fecha_inicio: date
    fecha_fin: Optional[date] = None


class ConfiguracionComisionCreate(ConfiguracionComisionBase):
    pass


class ConfiguracionComisionOut(ConfiguracionComisionBase):
    id: int
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConfiguracionComisionesResponse(BaseModel):
    configuraciones: List[ConfiguracionComisionOut]


# ============================
# COMISIONES VENDEDOR
# ============================

class ComisionVendedorOut(BaseModel):
    id: int
    venta_id: Optional[int] = None
    pedido_id: Optional[int] = None
    monto_venta: Decimal
    porcentaje_aplicado: Decimal
    monto_comision: Decimal
    tipo_venta: str
    estado: str
    fecha_venta: datetime
    sucursal_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VendedorInfo(BaseModel):
    id: int
    nombre: str


class ResumenComisionesVendedor(BaseModel):
    total_pendiente: Decimal
    total_liquidado: Decimal
    cantidad_ventas: int


class PaginationInfo(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int


class ComisionesVendedorResponse(BaseModel):
    vendedor: VendedorInfo
    resumen: ResumenComisionesVendedor
    comisiones: List[ComisionVendedorOut]
    pagination: PaginationInfo


# ============================
# LIQUIDACIÓN COMISIONES
# ============================

class LiquidarComisionesRequest(BaseModel):
    vendedor_id: int
    comisiones_ids: List[int]
    periodo_inicio: date
    periodo_fin: date
    metodo_pago: str
    referencia_pago: Optional[str] = None
    observaciones: Optional[str] = None


class LiquidarComisionesResponse(BaseModel):
    liquidacion_id: int
    vendedor_id: int
    monto_total: Decimal
    cantidad_comisiones: int
    fecha_liquidacion: datetime
    comisiones_liquidadas: List[int]


# ============================
# CALCULAR COMISIONES
# ============================

class CalcularComisionesRequest(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    vendedor_id: Optional[int] = None
    tipo_venta: Optional[str] = None


class DetalleComisionCalculada(BaseModel):
    vendedor_id: int
    vendedor_nombre: str
    cantidad: int
    monto_comisiones: Decimal


class CalcularComisionesResponse(BaseModel):
    comisiones_calculadas: int
    monto_total: Decimal
    ventas_procesadas: int
    detalles: List[DetalleComisionCalculada]