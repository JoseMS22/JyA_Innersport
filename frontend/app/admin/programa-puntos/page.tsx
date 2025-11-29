// frontend/app/admin/programa-puntos/programa-puntos.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api";

type ProgramaPuntosConfig = {
  id: number;
  activo: boolean;
  puntos_por_colon: string | number;
  valor_colon_por_punto: string | number;
  monto_minimo_para_redimir: string | number | null;
  porcentaje_max_descuento: string | number | null;
  max_descuento_por_compra_colones: string | number | null;
};

type FormState = {
  activo: boolean;
  puntos_por_colon: string;
  valor_colon_por_punto: string;
  monto_minimo_para_redimir: string;
  porcentaje_max_descuento: string;
  max_descuento_por_compra_colones: string;
};

const EMPTY_FORM: FormState = {
  activo: false,
  puntos_por_colon: "",
  valor_colon_por_punto: "",
  monto_minimo_para_redimir: "",
  porcentaje_max_descuento: "",
  max_descuento_por_compra_colones: "",
};

export default function ProgramaPuntosAdminPage() {
  const [config, setConfig] = useState<ProgramaPuntosConfig | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // =========================
  // Cargar configuración
  // =========================
  async function loadConfig() {
    try {
      setLoading(true);
      setError(null);
      const data = (await apiFetch("/api/v1/puntos/config", {
        method: "GET",
      })) as ProgramaPuntosConfig;

      setConfig(data);
      setForm({
        activo: data.activo,
        puntos_por_colon: String(data.puntos_por_colon ?? ""),
        valor_colon_por_punto: String(data.valor_colon_por_punto ?? ""),
        monto_minimo_para_redimir: data.monto_minimo_para_redimir
          ? String(data.monto_minimo_para_redimir)
          : "",
        porcentaje_max_descuento: data.porcentaje_max_descuento
          ? String(data.porcentaje_max_descuento)
          : "",
        max_descuento_por_compra_colones: data.max_descuento_por_compra_colones
          ? String(data.max_descuento_por_compra_colones)
          : "",
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cargar la configuración de puntos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  // =========================
  // Guardar configuración
  // =========================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        activo: form.activo,
        puntos_por_colon: form.puntos_por_colon
          ? form.puntos_por_colon
          : null,
        valor_colon_por_punto: form.valor_colon_por_punto
          ? form.valor_colon_por_punto
          : null,
        monto_minimo_para_redimir: form.monto_minimo_para_redimir
          ? form.monto_minimo_para_redimir
          : null,
        porcentaje_max_descuento: form.porcentaje_max_descuento
          ? form.porcentaje_max_descuento
          : null,
        max_descuento_por_compra_colones: form.max_descuento_por_compra_colones
          ? form.max_descuento_por_compra_colones
          : null,
      };

      const updated = (await apiFetch("/api/v1/puntos/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      })) as ProgramaPuntosConfig;

      setConfig(updated);
      setSuccess("Configuración actualizada correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // Helpers de ejemplo
  // =========================
  const puntosPorColon = Number(form.puntos_por_colon || "0");
  const valorPorPunto = Number(form.valor_colon_por_punto || "0");

  const ejemploCompra = 10000; // ₡10 000 de ejemplo
  const puntosPorEjemplo =
    puntosPorColon > 0 ? Math.round(ejemploCompra * puntosPorColon) : 0;
  const valorEjemploPuntos =
    valorPorPunto > 0 ? puntosPorEjemplo * valorPorPunto : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Programa de puntos
          </h1>
          <p className="text-xs text-gray-500 max-w-xl">
            Configura cómo acumulan y canjean puntos los clientes. Estos
            parámetros se aplican al carrito y más adelante al proceso de pago.
          </p>
        </div>
      </header>

      <section className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-4">
        {loading ? (
          <p className="text-gray-500 text-center py-6">
            Cargando configuración...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensajes */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                {success}
              </div>
            )}

            {/* Estado */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2">
              <div>
                <p className="font-semibold text-gray-800 text-[11px]">
                  Estado del programa
                </p>
                <p className="text-[11px] text-gray-500">
                  Si está desactivado, los clientes no verán ni podrán usar sus
                  puntos.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, activo: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                <span
                  className={
                    form.activo ? "text-emerald-600 font-semibold" : ""
                  }
                >
                  {form.activo ? "Activo" : "Inactivo"}
                </span>
              </label>
            </div>

            {/* Acumulación */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-semibold text-gray-800 text-[11px]">
                  Acumulación de puntos
                </p>
                <label className="block">
                  <span className="block mb-1 text-[11px] text-gray-600">
                    Puntos otorgados por cada colón pagado
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.0001"
                    value={form.puntos_por_colon}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        puntos_por_colon: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#a855f7]"
                    placeholder="Ej. 0.01 = 1 punto por cada ₡100"
                  />
                </label>
              </div>

              {/* Valor del punto */}
              <div className="space-y-2">
                <p className="font-semibold text-gray-800 text-[11px]">
                  Valor del punto
                </p>
                <label className="block">
                  <span className="block mb-1 text-[11px] text-gray-600">
                    Valor en colones de 1 punto
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.valor_colon_por_punto}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        valor_colon_por_punto: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#a855f7]"
                    placeholder="Ej. 5 = cada punto vale ₡5"
                  />
                </label>
              </div>
            </div>

            {/* Ejemplo */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] text-indigo-900">
              <p className="font-semibold mb-1">Ejemplo rápido</p>
              <p>
                Con la configuración actual, por una compra de{" "}
                <strong>₡{ejemploCompra.toLocaleString("es-CR")}</strong> el
                cliente ganaría{" "}
                <strong>{puntosPorEjemplo} punto(s)</strong>, que equivalen
                aproximadamente a{" "}
                <strong>
                  ₡{valorEjemploPuntos.toLocaleString("es-CR")}
                </strong>{" "}
                en descuentos futuros.
              </p>
            </div>

            {/* Uso y límites */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="font-semibold text-gray-800 text-[11px] mb-1">
                  Monto mínimo para redimir
                </p>
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={form.monto_minimo_para_redimir}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      monto_minimo_para_redimir: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#a855f7]"
                  placeholder="Ej. 10000 (opcional)"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Compra mínima (en colones) para usar puntos. Déjalo vacío si
                  no quieres mínimo.
                </p>
              </div>

              <div>
                <p className="font-semibold text-gray-800 text-[11px] mb-1">
                  Tope de descuento por compra (colones)
                </p>
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={form.max_descuento_por_compra_colones}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      max_descuento_por_compra_colones: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#a855f7]"
                  placeholder="Ej. 20000 (opcional)"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Límite absoluto de descuento por pedido. Protege márgenes
                  aunque el cliente tenga muchos puntos.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded-full bg-[#a855f7] text-white font-semibold text-xs hover:bg-[#7e22ce] disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar configuración"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}