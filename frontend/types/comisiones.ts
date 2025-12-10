// frontend/types/comisiones.ts

/**
 * Tipo para Comisión - Usado en toda la aplicación
 * Mantener sincronizado con el backend (schemas/dashboard.py)
 */
export type Comision = {
  id: number;
  vendedor_id: number;
  vendedor_nombre: string;
  tipo_venta: string;
  monto_venta: number;
  porcentaje_aplicado: number;
  monto_comision: number;
  estado: "PENDIENTE" | "LIQUIDADA" | "CANCELADA";
  fecha_venta: string;
  sucursal_nombre: string | null;
  venta_id: number | null;
  pedido_id: number | null;
};

/**
 * Filtros para listado de comisiones
 */
export type FiltrosComisiones = {
  vendedor_id: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  tipo_venta: string | null;
};

/**
 * Configuración de comisión
 */
export type ConfiguracionComision = {
  id: number;
  tipo_venta: string;
  porcentaje: number;
  monto_minimo: number | null;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string | null;
};

/**
 * Request para liquidar comisiones
 */
export type LiquidarComisionesRequest = {
  vendedor_id: number;
  comisiones_ids: number[];
  periodo_inicio: string;
  periodo_fin: string;
  metodo_pago: string;
  referencia_pago?: string;
  observaciones?: string;
};

/**
 * Response de liquidación
 */
export type LiquidarComisionesResponse = {
  liquidacion_id: number;
  vendedor_id: number;
  monto_total: number;
  cantidad_comisiones: number;
  fecha_liquidacion: string;
  comisiones_liquidadas: number[];
};

/**
 * Request para calcular comisiones
 */
export type CalcularComisionesRequest = {
  fecha_inicio: string;
  fecha_fin: string;
  vendedor_id?: number;
  tipo_venta?: string;
};