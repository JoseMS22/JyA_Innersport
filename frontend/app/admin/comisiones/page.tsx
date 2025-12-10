// frontend/app/admin/comisiones/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ComisionesTable } from "./_components/ComisionesTable";
import { FiltrosComisiones } from "./_components/FiltrosComisiones";
import { ExportButton } from "./_components/ExportButton";
import { Toast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { Tooltip } from "@/components/ui/tooltip";
import type { Comision, FiltrosComisiones as FiltrosType } from "@/types/comisiones";
import Link from "next/link";

export default function ComisionesPage() {
  const router = useRouter();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Toast y Alert
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);
  
  const [confirmCalcular, setConfirmCalcular] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosType>({
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
      setToast({
        type: "error",
        title: "Error al cargar",
        message: error?.message || "No se pudieron cargar las comisiones",
      });

      if (error?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCalcularComisiones = async () => {
    if (!filtros.fecha_inicio || !filtros.fecha_fin) {
      setToast({
        type: "warning",
        title: "Rango de fechas requerido",
        message: "Debes seleccionar un rango de fechas para calcular comisiones",
      });
      return;
    }

    setConfirmCalcular(true);
  };

  const confirmarCalculoComisiones = async () => {
    try {
      setLoading(true);
      setConfirmCalcular(false);

      await apiFetch("/api/v1/comisiones/calcular", {
        method: "POST",
        body: JSON.stringify({
          fecha_inicio: filtros.fecha_inicio!.split("T")[0],
          fecha_fin: filtros.fecha_fin!.split("T")[0],
          vendedor_id: filtros.vendedor_id,
          tipo_venta: filtros.tipo_venta,
        }),
      });

      setToast({
        type: "success",
        title: "¡Comisiones calculadas!",
        message: "Las comisiones se calcularon exitosamente",
      });
      
      cargarComisiones();
    } catch (error: any) {
      console.error("Error calculando comisiones:", error);
      setToast({
        type: "error",
        title: "Error al calcular",
        message: error?.message || "No se pudieron calcular las comisiones",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidar = () => {
    if (selectedComisiones.length === 0) {
      setToast({
        type: "warning",
        title: "Selección requerida",
        message: "Debes seleccionar al menos una comisión para liquidar",
      });
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

        <div className="flex gap-2">
          {/* Botón Configuración - Mismo estilo que calcular */}
          <Tooltip text="Configuración de comisiones" position="bottom">
            <Link
              href="/admin/comisiones/configuracion"
              className="p-2.5 bg-[#b157e0] text-white rounded-lg hover:bg-[#9d4ac4] transition-colors flex items-center justify-center"
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
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m6-12l-6 6m0 0L6 7m12 10l-6-6m0 0l-6 6" />
              </svg>
            </Link>
          </Tooltip>

          {/* Botón Calcular Comisiones - Con fondo morado */}
          <Tooltip text="Calcular comisiones del período" position="bottom">
            <button
              onClick={handleCalcularComisiones}
              disabled={loading}
              className="p-2.5 bg-[#b157e0] text-white rounded-lg hover:bg-[#9d4ac4] disabled:opacity-50 transition-colors"
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
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosComisiones filtros={filtros} onChange={setFiltros} />

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {comisiones.length} comisiones encontradas
          {selectedComisiones.length > 0 && (
            <span className="ml-2 text-[#b157e0] font-medium">
              ({selectedComisiones.length} seleccionadas)
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {/* Botón Liquidar - Solo icono */}
          {selectedComisiones.length > 0 && (
            <Tooltip text="Liquidar comisiones seleccionadas" position="bottom">
              <button
                onClick={handleLiquidar}
                className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </button>
            </Tooltip>
          )}

          {/* Botón Exportar - Solo icono con tooltip integrado */}
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

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={3500}
        />
      )}

      {/* Alert de confirmación para calcular comisiones */}
      {confirmCalcular && (
        <Alert
          title="¿Calcular comisiones?"
          message={`Se calcularán las comisiones para el período seleccionado. ${
            filtros.vendedor_id 
              ? "Solo para el vendedor seleccionado." 
              : "Para todos los vendedores."
          }`}
          type="info"
          confirmText="Sí, calcular"
          cancelText="Cancelar"
          showCancel={true}
          onConfirm={confirmarCalculoComisiones}
          onCancel={() => setConfirmCalcular(false)}
        />
      )}
    </div>
  );
}