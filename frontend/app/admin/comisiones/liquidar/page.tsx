// frontend/app/admin/comisiones/liquidar/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

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
  sucursal_nombre?: string | null;
};

export default function LiquidarComisionesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    metodo_pago: "TRANSFERENCIA",
    referencia_pago: "",
    observaciones: "",
  });

  useEffect(() => {
    cargarComisiones();
  }, []);

  const cargarComisiones = async () => {
    try {
      const ids = searchParams.get("ids");
      if (!ids) {
        router.push("/admin/comisiones");
        return;
      }

      const idsArray = ids.split(",").map(Number);

      // Cargar todas las comisiones seleccionadas
      const params = new URLSearchParams();
      params.append("estado", "PENDIENTE");
      
      const response = await apiFetch(`/api/v1/comisiones/listar?${params}`);
      
      // Filtrar solo las comisiones seleccionadas
      const comisionesSeleccionadas = response.comisiones.filter((c: Comision) =>
        idsArray.includes(c.id)
      );

      if (comisionesSeleccionadas.length === 0) {
        setErrorMsg("No se encontraron las comisiones seleccionadas");
        return;
      }

      // Verificar que todas son del mismo vendedor
      const vendedorIds = [...new Set(comisionesSeleccionadas.map((c: Comision) => c.vendedor_id))];
      if (vendedorIds.length > 1) {
        setErrorMsg("Solo se pueden liquidar comisiones de un mismo vendedor a la vez");
        return;
      }

      setComisiones(comisionesSeleccionadas);
    } catch (error: any) {
      console.error("Error cargando comisiones:", error);
      setErrorMsg(error?.message || "Error al cargar comisiones");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.metodo_pago) {
      setErrorMsg("Debes seleccionar un método de pago");
      return;
    }

    if (comisiones.length === 0) {
      setErrorMsg("No hay comisiones para liquidar");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const vendedor_id = comisiones[0].vendedor_id;
      const comisiones_ids = comisiones.map((c) => c.id);

      // Calcular período
      const fechas = comisiones.map((c) => new Date(c.fecha_venta));
      const periodo_inicio = new Date(
        Math.min(...fechas.map((d) => d.getTime()))
      )
        .toISOString()
        .split("T")[0];
      const periodo_fin = new Date(Math.max(...fechas.map((d) => d.getTime())))
        .toISOString()
        .split("T")[0];

      await apiFetch("/api/v1/comisiones/liquidar", {
        method: "POST",
        body: JSON.stringify({
          vendedor_id,
          comisiones_ids,
          periodo_inicio,
          periodo_fin,
          metodo_pago: formData.metodo_pago,
          referencia_pago: formData.referencia_pago || null,
          observaciones: formData.observaciones || null,
        }),
      });

      alert("Comisiones liquidadas exitosamente");
      router.push("/admin/comisiones");
    } catch (error: any) {
      console.error("Error liquidando comisiones:", error);
      setErrorMsg(error?.message || "Error al liquidar comisiones");
    } finally {
      setSubmitting(false);
    }
  };

  const montoTotal = comisiones.reduce((sum, c) => sum + c.monto_comision, 0);

  const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 mt-3">Cargando...</p>
      </div>
    );
  }

  if (comisiones.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-800">No se encontraron comisiones para liquidar</p>
          <button
            onClick={() => router.push("/admin/comisiones")}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Volver a Comisiones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#6b21a8]">
          Liquidar Comisiones
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Registra el pago de comisiones al vendedor
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Resumen */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen de Liquidación
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Vendedor:</span>
            <span className="font-medium">
              {comisiones[0]?.vendedor_nombre || "N/A"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Comisiones a liquidar:</span>
            <span className="font-medium">{comisiones.length}</span>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="text-lg font-semibold text-gray-900">
              Monto Total:
            </span>
            <span className="text-2xl font-bold text-purple-600">
              {currency.format(montoTotal)}
            </span>
          </div>
        </div>

        {/* Detalle de comisiones */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Detalle de Comisiones
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {comisiones.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center text-sm py-2 px-3 bg-gray-50 rounded"
              >
                <div className="flex-1">
                  <span className="text-gray-600">
                    {new Date(c.fecha_venta).toLocaleDateString("es-CR")}
                  </span>
                  {c.sucursal_nombre && (
                    <span className="ml-2 text-gray-500">• {c.sucursal_nombre}</span>
                  )}
                </div>
                <span className="font-medium text-purple-600">
                  {currency.format(c.monto_comision)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Método de Pago *
          </label>
          <select
            value={formData.metodo_pago}
            onChange={(e) =>
              setFormData({ ...formData, metodo_pago: e.target.value })
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referencia de Pago
          </label>
          <input
            type="text"
            value={formData.referencia_pago}
            onChange={(e) =>
              setFormData({ ...formData, referencia_pago: e.target.value })
            }
            placeholder="Ej: TRANS-2025-001"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) =>
              setFormData({ ...formData, observaciones: e.target.value })
            }
            rows={3}
            placeholder="Notas adicionales..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Procesando..." : "💵 Liquidar Comisiones"}
          </button>
        </div>
      </form>
    </div>
  );
}