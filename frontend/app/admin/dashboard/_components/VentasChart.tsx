// frontend/app/admin/dashboard/_components/VentasChart.tsx
"use client";

import { useState, useEffect } from "react";

type Filtros = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sucursal_id: number | null;
};

type VentasChartProps = {
  filtros: Filtros;
};

export function VentasChart({ filtros }: VentasChartProps) {
  // Placeholder - aquí puedes integrar una librería como Recharts
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-[#6b21a8] mb-4">
        Evolución de Ventas
      </h3>

      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-sm text-gray-500">
            Gráfica de ventas
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Integrar con Recharts o Chart.js
          </div>
        </div>
      </div>
    </div>
  );
}