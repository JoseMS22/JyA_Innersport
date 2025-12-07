// frontend/app/admin/comisiones/configuracion/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Configuracion = {
  id: number;
  tipo_venta: string;
  porcentaje_comision: number;
  monto_minimo: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
};

export default function ConfiguracionComisionesPage() {
  const router = useRouter();
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tipo_venta: "POS",
    porcentaje_comision: "5.00",
    monto_minimo: "0.00",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: "",
  });

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/v1/comisiones/configuracion");
      setConfiguraciones(data.configuraciones || []);
    } catch (error: any) {
      console.error("Error cargando configuraciones:", error);
      setErrorMsg(error?.message || "Error al cargar configuraciones");

      if (error?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setErrorMsg(null);
      setSuccessMsg(null);

      await apiFetch("/api/v1/comisiones/configuracion", {
        method: "POST",
        body: JSON.stringify({
          tipo_venta: formData.tipo_venta,
          porcentaje_comision: parseFloat(formData.porcentaje_comision),
          monto_minimo: parseFloat(formData.monto_minimo),
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin || null,
        }),
      });

      setSuccessMsg("Configuración guardada exitosamente");
      setShowForm(false);
      cargarConfiguraciones();

      // Limpiar formulario
      setFormData({
        tipo_venta: "POS",
        porcentaje_comision: "5.00",
        monto_minimo: "0.00",
        fecha_inicio: new Date().toISOString().split("T")[0],
        fecha_fin: "",
      });

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error("Error guardando configuración:", error);
      setErrorMsg(error?.message || "Error al guardar configuración");
    }
  };

  const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6b21a8]">
            Configuración de Comisiones
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Define porcentajes y reglas para el cálculo de comisiones
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          ← Volver
        </button>
      </div>

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

      {/* Lista de configuraciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Configuraciones Activas
          </h2>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            {showForm ? "Cancelar" : "+ Nueva Configuración"}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : configuraciones.length > 0 ? (
          <div className="space-y-3">
            {configuraciones.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">
                      {config.tipo_venta}
                    </span>
                    {config.activo && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Activa
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Porcentaje:</span>{" "}
                      <span className="font-medium text-purple-600">
                        {config.porcentaje_comision}%
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500">Monto mínimo:</span>{" "}
                      <span className="font-medium">
                        {currency.format(config.monto_minimo)}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500">Desde:</span>{" "}
                      <span className="font-medium">
                        {new Date(config.fecha_inicio).toLocaleDateString("es-CR")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay configuraciones activas
          </div>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Nueva Configuración
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Venta *
              </label>
              <select
                value={formData.tipo_venta}
                onChange={(e) =>
                  setFormData({ ...formData, tipo_venta: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="POS">POS (Punto de Venta)</option>
                <option value="ONLINE">Online (E-commerce)</option>
                <option value="TELEFONICA">Telefónica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje de Comisión (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.porcentaje_comision}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    porcentaje_comision: e.target.value,
                  })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Mínimo (₡)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.monto_minimo}
                onChange={(e) =>
                  setFormData({ ...formData, monto_minimo: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_inicio: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Fin (opcional)
              </label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_fin: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      )}

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Al crear una nueva configuración, la configuración anterior del
                mismo tipo se desactivará automáticamente
              </li>
              <li>
                El monto mínimo define la venta mínima requerida para generar
                comisión
              </li>
              <li>
                Las comisiones se calculan sobre el total de la venta (incluyendo impuestos)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}