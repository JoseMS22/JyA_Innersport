// frontend/app/admin/comisiones/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ComisionesTable } from "./_components/ComisionesTable";
import { FiltrosComisiones } from "./_components/FiltrosComisiones";
import { ExportButton } from "./_components/ExportButton";
import Link from "next/link";

type Comision = {
  id: number;
  vendedor_id: number;
  vendedor_nombre: string;
  monto_venta: number;
  monto_comision: number;
  porcentaje_aplicado: number;
  tipo_venta: string;
  estado: string;
  fecha_venta: string;
  sucursal_nombre: string | null;
};

type Filtros = {
  vendedor_id: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  tipo_venta: string | null;
};

export default function ComisionesPage() {
  const router = useRouter();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<Filtros>({
    vendedor_id: null,
    fecha_inicio: null,
    fecha_fin: null,
    estado: "TODOS",
    tipo_venta: null,
  });

  const [selectedComisiones, setSelectedComisiones] = useState<number[]>([]);

  useEffect(() => {
    cargarComisiones();
  }, [filtros]);

  const cargarComisiones = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = new URLSearchParams();

      if (filtros.vendedor_id) params.append("vendedor_id", String(filtros.vendedor_id));
      if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
      if (filtros.estado !== "TODOS") params.append("estado", filtros.estado);
      if (filtros.tipo_venta) params.append("tipo_venta", filtros.tipo_venta);

      const data = await apiFetch(`/api/v1/comisiones/listar?${params}`);
      setComisiones(data.comisiones || []);
    } catch (error: any) {
      console.error("Error cargando comisiones:", error);
      setErrorMsg(error?.message || "Error al cargar comisiones");

      if (error?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCalcularComisiones = async () => {
    if (!filtros.fecha_inicio || !filtros.fecha_fin) {
      setErrorMsg("Debes seleccionar un rango de fechas para calcular comisiones");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      await apiFetch("/api/v1/comisiones/calcular", {
        method: "POST",
        body: JSON.stringify({
          fecha_inicio: filtros.fecha_inicio.split("T")[0],
          fecha_fin: filtros.fecha_fin.split("T")[0],
          vendedor_id: filtros.vendedor_id,
          tipo_venta: filtros.tipo_venta,
        }),
      });

      setSuccessMsg("Comisiones calculadas exitosamente");
      setTimeout(() => setSuccessMsg(null), 3000);
      cargarComisiones();
    } catch (error: any) {
      console.error("Error calculando comisiones:", error);
      setErrorMsg(error?.message || "Error al calcular comisiones");
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidar = () => {
    if (selectedComisiones.length === 0) {
      setErrorMsg("Debes seleccionar al menos una comisión para liquidar");
      return;
    }

    // Redirigir a página de liquidación con IDs seleccionados
    const ids = selectedComisiones.join(",");
    router.push(`/admin/comisiones/liquidar?ids=${ids}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6b21a8]">
            Gestión de Comisiones
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Administra y liquida comisiones de vendedores
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/comisiones/configuracion"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            ⚙️ Configuración
          </Link>

          <button
            onClick={handleCalcularComisiones}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            🧮 Calcular Comisiones
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Filtros */}
      <FiltrosComisiones filtros={filtros} onChange={setFiltros} />

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {comisiones.length} comisiones encontradas
          {selectedComisiones.length > 0 && (
            <span className="ml-2 text-purple-600 font-medium">
              ({selectedComisiones.length} seleccionadas)
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {selectedComisiones.length > 0 && (
            <button
              onClick={handleLiquidar}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              💵 Liquidar Seleccionadas
            </button>
          )}

          <ExportButton formato="csv" filtros={filtros} />
        </div>
      </div>

      {/* Tabla */}
      <ComisionesTable
        comisiones={comisiones}
        loading={loading}
        selectedIds={selectedComisiones}
        onSelectionChange={setSelectedComisiones}
        onRefresh={cargarComisiones}
      />
    </div>
  );
}