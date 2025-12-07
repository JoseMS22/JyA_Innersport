# backend/app/schemas/dashboard_schemas.py
"""
Schemas para Dashboard y Comisiones
US-39: Dashboard Administrativo con métricas en tiempo real
US-44: Gestión de Comisiones por Vendedor
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class TipoVentaEnum(str, Enum):
    """Tipos de venta para comisiones"""
    POS = "POS"
    ONLINE = "ONLINE"


class EstadoComisionEnum(str, Enum):
    """Estados de comisión"""
    PENDIENTE = "PENDIENTE"
    LIQUIDADA = "LIQUIDADA"
    CANCELADA = "CANCELADA"


class MetodoPagoLiquidacionEnum(str, Enum):
    """Métodos de pago para liquidación"""
    EFECTIVO = "EFECTIVO"
    TRANSFERENCIA = "TRANSFERENCIA"
    CHEQUE = "CHEQUE"


# =============================================================================
# SCHEMAS DE DASHBOARD (US-39)
# =============================================================================

class VentasTotales(BaseModel):
    """Métricas de ventas totales"""
    monto: float = Field(..., description="Monto total de ventas")
    cantidad: int = Field(..., description="Cantidad de ventas")
    variacion_porcentual: float = Field(..., description="Variación vs período anterior")


class PedidosActivos(BaseModel):
    """Métricas de pedidos activos"""
    total: int = Field(..., description="Total de pedidos activos")
    por_estado: Dict[str, int] = Field(default_factory=dict, description="Pedidos por estado")


class MetricasDashboard(BaseModel):
    """Métricas principales del dashboard"""
    ventas_totales: VentasTotales
    pedidos_activos: PedidosActivos
    ticket_promedio: float = Field(..., description="Ticket promedio")
    ventas_por_canal: Dict[str, float] = Field(default_factory=dict, description="Ventas por canal (POS/ONLINE)")
    ultima_actualizacion: str = Field(..., description="Timestamp de última actualización")

    model_config = ConfigDict(from_attributes=True)


class VariantePopular(BaseModel):
    """Variante popular de un producto"""
    variante_nombre: str
    cantidad_vendida: int


class ProductoTop(BaseModel):
    """Producto más vendido"""
    producto_id: int
    producto_nombre: str
    cantidad_total: int
    monto_total: float
    variantes_populares: List[VariantePopular] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AlertaInventario(BaseModel):
    """Alerta de inventario bajo"""
    variante_id: int
    producto_nombre: str
    variante_nombre: str
    stock_actual: int
    stock_minimo: int
    nivel_alerta: str = Field(..., description="CRITICO, BAJO, MEDIO")
    sucursal_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DesempenoVendedor(BaseModel):
    """Desempeño de un vendedor"""
    vendedor_id: int
    vendedor_nombre: str
    total_ventas: float
    cantidad_ventas: int
    comisiones_generadas: float
    ticket_promedio: float
    ranking: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# SCHEMAS DE COMISIONES (US-44)
# =============================================================================

class ConfiguracionComisionBase(BaseModel):
    """Base para configuración de comisión"""
    tipo_venta: TipoVentaEnum
    porcentaje: Decimal = Field(..., ge=0, le=100, description="Porcentaje de comisión (0-100)")
    monto_minimo: Optional[Decimal] = Field(None, ge=0, description="Monto mínimo para aplicar comisión")
    activo: bool = True


class ConfiguracionComisionCreate(ConfiguracionComisionBase):
    """Schema para crear configuración de comisión"""
    pass


class ConfiguracionComisionUpdate(BaseModel):
    """Schema para actualizar configuración de comisión"""
    porcentaje: Optional[Decimal] = Field(None, ge=0, le=100)
    monto_minimo: Optional[Decimal] = Field(None, ge=0)
    activo: Optional[bool] = None


class ConfiguracionComisionRead(ConfiguracionComisionBase):
    """Schema para leer configuración de comisión"""
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ComisionVendedorBase(BaseModel):
    """Base para comisión de vendedor"""
    vendedor_id: int
    tipo_venta: TipoVentaEnum
    monto_venta: Decimal
    monto_comision: Decimal
    porcentaje_aplicado: Decimal


class ComisionVendedorRead(ComisionVendedorBase):
    """Schema para leer comisión de vendedor"""
    id: int
    venta_pos_id: Optional[int] = None
    pedido_id: Optional[int] = None
    estado: EstadoComisionEnum
    fecha_venta: datetime
    fecha_liquidacion: Optional[datetime] = None
    liquidacion_id: Optional[int] = None
    liquidado_por_id: Optional[int] = None
    
    # Datos adicionales para frontend
    vendedor_nombre: Optional[str] = None
    sucursal_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ResumenComisionesVendedor(BaseModel):
    """Resumen de comisiones de un vendedor"""
    vendedor_id: int
    vendedor_nombre: str
    total_pendiente: Decimal = Decimal("0")
    total_liquidado: Decimal = Decimal("0")
    cantidad_pendiente: int = 0
    cantidad_liquidado: int = 0
    ultima_liquidacion: Optional[datetime] = None


class LiquidacionComisionBase(BaseModel):
    """Base para liquidación de comisión"""
    vendedor_id: int
    periodo_inicio: datetime
    periodo_fin: datetime
    monto_total: Decimal
    cantidad_ventas: int
    metodo_pago: MetodoPagoLiquidacionEnum
    referencia_pago: Optional[str] = None
    observaciones: Optional[str] = None


class LiquidacionComisionCreate(LiquidacionComisionBase):
    """Schema para crear liquidación de comisión"""
    comisiones_ids: List[int] = Field(..., min_length=1, description="IDs de comisiones a liquidar")


class LiquidacionComisionRead(LiquidacionComisionBase):
    """Schema para leer liquidación de comisión"""
    id: int
    fecha_liquidacion: datetime
    liquidado_por_id: int
    
    # Datos adicionales
    liquidado_por_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CalcularComisionesRequest(BaseModel):
    """Request para calcular comisiones"""
    vendedor_id: Optional[int] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    tipo_venta: Optional[TipoVentaEnum] = None
    sucursal_id: Optional[int] = None


class CalcularComisionesResponse(BaseModel):
    """Response de cálculo de comisiones"""
    comisiones_calculadas: int
    monto_total: Decimal
    mensaje: str