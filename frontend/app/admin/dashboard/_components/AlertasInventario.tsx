// frontend/app/admin/dashboard/_components/AlertasInventario.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Filtros = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sucursal_id: number | null;
};

type Alerta = {
  variante_id: number;
  producto_nombre: string;
  talla: string | null;
  color: string | null;
  sucursal_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  nivel_alerta: "CRITICO" | "BAJO" | "MEDIO";
};

type AlertasInventarioProps = {
  filtros: Filtros;
};

export function AlertasInventario({ filtros }: AlertasInventarioProps) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarAlertas();
  }, [filtros]);

  const cargarAlertas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.sucursal_id) params.append("sucursal_id", String(filtros.sucursal_id));
      params.append("umbral_minimo", "5");

      const data = await apiFetch(`/api/v1/dashboard/alertas-inventario?${params}`);
      setAlertas(data.alertas || []);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case "CRITICO":
        return "bg-red-100 text-red-700 border-red-200";
      case "BAJO":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#6b21a8]">
          Alertas de Inventario
        </h3>
        {alertas.length > 0 && (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            {alertas.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : alertas.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {alertas.slice(0, 10).map((alerta) => (
            <div
              key={`${alerta.variante_id}-${alerta.sucursal_nombre}`}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div
                className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium border ${getNivelColor(
                  alerta.nivel_alerta
                )}`}
              >
                {alerta.nivel_alerta}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">
                  {alerta.producto_nombre}
                </div>

                <div className="text-xs text-gray-500 mt-0.5">
                  {alerta.talla && `Talla: ${alerta.talla} `}
                  {alerta.color && `• Color: ${alerta.color}`}
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-600">
                    {alerta.sucursal_nombre}
                  </span>
                  <span className="text-xs">•</span>
                  <span className="text-xs font-medium text-red-600">
                    Stock: {alerta.stock_actual}
                  </span>
                  <span className="text-xs text-gray-500">
                    (mín: {alerta.stock_minimo})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-sm text-gray-500">
            No hay alertas de inventario
          </div>
        </div>
      )}
    </div>
  );
}