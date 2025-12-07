// frontend/app/admin/comisiones/_components/ExportButton.tsx
"use client";

import { useState } from "react";

type Filtros = {
  vendedor_id: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  tipo_venta: string | null;
};

type ExportButtonProps = {
  formato: "csv" | "pdf";
  filtros: Filtros;
};

export function ExportButton({ formato, filtros }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("formato", formato);

      if (filtros.vendedor_id) params.append("vendedor_id", String(filtros.vendedor_id));
      if (filtros.fecha_inicio) {
        const date = new Date(filtros.fecha_inicio);
        params.append("fecha_inicio", date.toISOString().split("T")[0]);
      }
      if (filtros.fecha_fin) {
        const date = new Date(filtros.fecha_fin);
        params.append("fecha_fin", date.toISOString().split("T")[0]);
      }
      if (filtros.estado !== "TODOS") params.append("estado", filtros.estado);
      if (filtros.tipo_venta) params.append("tipo_venta", filtros.tipo_venta);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/comisiones/reporte/exportar?${params}`,
        {
          method: "GET",
          credentials: "include", // ✅ Envía cookies automáticamente
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error desconocido" }));
        console.error("Error del servidor:", errorData);
        throw new Error(errorData.detail || "Error al exportar reporte");
      }

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comisiones_${new Date().toISOString().split("T")[0]}.${formato}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exportando:", error);
      alert(error instanceof Error ? error.message : "Error al exportar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm flex items-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          Exportando...
        </>
      ) : (
        <>
          📄 Exportar {formato.toUpperCase()}
        </>
      )}
    </button>
  );
}