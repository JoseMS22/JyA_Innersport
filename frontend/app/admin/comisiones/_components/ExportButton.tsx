// frontend/app/admin/comisiones/_components/ExportButton.tsx
"use client";

import { Tooltip } from "@/components/ui/tooltip";
import type { FiltrosComisiones } from "@/types/comisiones";

type ExportButtonProps = {
  formato: "csv";
  filtros: FiltrosComisiones;
};

export function ExportButton({ formato, filtros }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();

      if (filtros.vendedor_id) params.append("vendedor_id", String(filtros.vendedor_id));
      if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
      if (filtros.estado !== "TODOS") params.append("estado", filtros.estado);
      if (filtros.tipo_venta) params.append("tipo_venta", filtros.tipo_venta);
      params.append("formato", formato);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const url = `${API_BASE_URL}/api/v1/comisiones/reporte/exportar?${params}`;

      // Abrir en nueva ventana para descargar
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error exportando:", error);
    }
  };

  return (
    <Tooltip text="Exportar a CSV" position="bottom">
      <button
        onClick={handleExport}
        className="p-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </Tooltip>
  );
}