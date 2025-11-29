// frontend/lib/types.ts

export type Media = {
  id: number;
  producto_id: number;
  url: string;
  tipo?: string | null;
  orden?: number | null;
};

export type Categoria = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

export type Producto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  categorias: Categoria[];
  media: Media[];
};

// Variante con precio y relación al producto
export type Variante = {
  id: number;
  producto_id: number;
  sku: string;
  barcode?: string | null;
  color?: string | null;
  talla?: string | null;
  precio_actual: number;  // en backend es Decimal, aquí number
  activo: boolean;
};