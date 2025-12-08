// frontend/app/admin/dashboard/_components/VentasChart.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Filtros = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sucursal_id: number | null;
};

type VentasChartProps = {
  filtros: Filtros;
};

type DatoVenta = {
  fecha: string;
  total: number;
  cantidad: number;
};

export function VentasChart({ filtros }: VentasChartProps) {
  const [datos, setDatos] = useState<DatoVenta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
      if (filtros.sucursal_id) params.append("sucursal_id", String(filtros.sucursal_id));

      const response = await apiFetch(`/api/v1/dashboard/ventas-historico?${params}`);
      setDatos(response.datos || []);
    } catch (error) {
      console.error("Error cargando datos de ventas:", error);
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-CR", { month: "short", day: "numeric" });
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const maxTotal = Math.max(...datos.map(d => d.total), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-[#6b21a8] mb-4">
        Evolución de Ventas
      </h3>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block w-6 h-6 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : datos.length > 0 ? (
        <div className="space-y-3">
          {/* Leyenda */}
          <div className="flex gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span>Monto de Ventas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Transacciones</span>
            </div>
          </div>

          {/* Gráfico de barras simple */}
          <div className="space-y-2">
            {datos.slice(-10).map((dato, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">
                    {formatearFecha(dato.fecha)}
                  </span>
                  <span className="text-purple-600 font-semibold">
                    {formatearMoneda(dato.total)}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Barra de monto */}
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full flex items-center justify-end px-2"
                      style={{ width: `${(dato.total / maxTotal) * 100}%` }}
                    >
                      <span className="text-[10px] text-white font-medium">
                        {dato.cantidad} vtas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Total Período</div>
                <div className="font-bold text-purple-600">
                  {formatearMoneda(datos.reduce((sum, d) => sum + d.total, 0))}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Transacciones</div>
                <div className="font-bold text-green-600">
                  {datos.reduce((sum, d) => sum + d.cantidad, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-sm text-gray-500">No hay datos de ventas</div>
            <div className="text-xs text-gray-400 mt-1">
              Cambia el rango de fechas o la sucursal
            </div>
          </div>
        </div>
      )}
    </div>
  );
}