// frontend/app/admin/dashboard/_components/TopProductos.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Filtros = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sucursal_id: number | null;
};

type Variante = {
  variante_id: number;
  talla: string | null;
  color: string | null;
  cantidad: number;
};

type Producto = {
  producto_id: number;
  nombre: string;
  cantidad_vendida: number;
  monto_total: number;
  variantes_populares: Variante[];
};

type TopProductosProps = {
  filtros: Filtros;
};

export function TopProductos({ filtros }: TopProductosProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarProductos();
  }, [filtros]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
      if (filtros.sucursal_id) params.append("sucursal_id", String(filtros.sucursal_id));
      params.append("limit", "5");

      const data = await apiFetch(`/api/v1/dashboard/productos-top?${params}`);
      setProductos(data.productos || []);
    } catch (error) {
      console.error("Error cargando productos top:", error);
    } finally {
      setLoading(false);
    }
  };

  const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-[#6b21a8] mb-4">
        Productos Más Vendidos
      </h3>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : productos.length > 0 ? (
        <div className="space-y-4">
          {productos.map((producto, index) => (
            <div
              key={producto.producto_id}
              className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {producto.nombre}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {producto.cantidad_vendida} unidades • {currency.format(producto.monto_total)}
                </div>

                {producto.variantes_populares.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {producto.variantes_populares.slice(0, 2).map((v) => (
                      <span
                        key={v.variante_id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700"
                      >
                        {v.talla && `${v.talla} `}
                        {v.color && `${v.color}`} ({v.cantidad})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          No hay datos de productos para mostrar
        </div>
      )}
    </div>
  );
}