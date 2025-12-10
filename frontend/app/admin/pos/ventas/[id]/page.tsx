// frontend/app/admin/pos/ventas/[id]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useNotifications } from "@/app/context/NotificationContext";

type VentaItem = {
  id: number;
  variante_id: number;
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
};

type PagoPOS = {
  id: number;
  metodo: string;
  monto: string;
  referencia?: string | null;
  fecha: string;
};

type VentaDetail = {
  id: number;
  sucursal_id: number;
  sucursal_nombre: string;
  vendedor_id: number;
  vendedor_nombre: string;
  cliente_id?: number | null;
  nombre_cliente_ticket?: string | null;
  subtotal: string;
  descuento_puntos: string;
  impuesto: string;
  total: string;
  puntos_ganados: number;
  estado: string;
  fecha_creacion: string;
  items: VentaItem[];
  pagos: PagoPOS[];
};

const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

// Estados posibles de la venta POS
const ESTADOS_VENTA_POS = ["PAGADO", "ENTREGADO", "CANCELADO"] as const;

export default function AdminPosVentaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useNotifications();
  const id = Number(params?.id);

  const [venta, setVenta] = useState<VentaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [estadoLocal, setEstadoLocal] = useState<string>("");
  const [savingEstado, setSavingEstado] = useState(false);

  async function loadVenta() {
    try {
      setLoading(true);

      const data = (await apiFetch(`/api/v1/pos/ventas/${id}`, {
        method: "GET",
      })) as VentaDetail;

      setVenta(data);
      setEstadoLocal(data.estado);
    } catch (err: any) {
      console.error(err);
      showError(
        "Error al cargar",
        err?.message ?? "No se pudo cargar la venta POS"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isNaN(id)) {
      loadVenta();
    }
  }, [id]);

  async function handleCambiarEstado(e: FormEvent) {
    e.preventDefault();
    if (!venta) return;

    try {
      setSavingEstado(true);

      await apiFetch(`/api/v1/pos/ventas/${venta.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: estadoLocal }),
      });

      await loadVenta();
      success(
        "Estado actualizado",
        "El estado de la venta POS se actualizó correctamente."
      );
    } catch (err: any) {
      console.error(err);
      showError(
        "Error al actualizar",
        err?.message ?? "No se pudo actualizar el estado de la venta POS"
      );
    } finally {
      setSavingEstado(false);
    }
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-xs text-gray-500">
        Cargando venta POS...
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-red-600">
          No se pudo cargar la venta POS
        </p>
        <button
          onClick={() => router.push("/admin/pos/ventas")}
          className="text-xs text-[#6b21a8] underline"
        >
          Volver a la lista de ventas POS
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Venta POS #{venta.id}
          </h1>
          <p className="text-xs text-gray-500">
            Creada el{" "}
            {new Date(venta.fecha_creacion).toLocaleString("es-CR")}
          </p>
          <p className="text-[11px] text-gray-500">
            Sucursal:{" "}
            <span className="font-semibold">
              {venta.sucursal_nombre}
            </span>
          </p>
          <p className="text-[11px] text-gray-500">
            Vendedor:{" "}
            <span className="font-semibold">
              {venta.vendedor_nombre}
            </span>
          </p>
          <p className="text-[11px] text-gray-500">
            Cliente en ticket:{" "}
            <span className="font-semibold">
              {venta.nombre_cliente_ticket || "Anónimo"}
            </span>
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/pos/ventas")}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          Volver
        </button>
      </header>

      {/* Estado + Totales */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Estado */}
        <div className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">
            Estado de la venta POS
          </h2>
          <form onSubmit={handleCambiarEstado} className="space-y-2">
            <div>
              <label className="block mb-1 text-gray-700">
                Estado actual
              </label>
              <select
                value={estadoLocal}
                onChange={(e) => setEstadoLocal(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7] text-xs"
              >
                {ESTADOS_VENTA_POS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-500">
              Usa este control para marcar la venta como pagada, entregada o cancelada
              según corresponda.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={savingEstado}
                className="px-3 py-1.5 rounded-full 
                  bg-[#f5f3ff] text-[#6b21a8] 
                  border border-[#a855f7]/40 
                  shadow-sm text-xs font-semibold
                  hover:bg-[#ede9fe]
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingEstado ? "Guardando..." : "Actualizar estado"}
              </button>
            </div>
          </form>
        </div>

        {/* Totales */}
        <div className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Resumen de pago
          </h2>
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">
              {currency.format(Number(venta.subtotal))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Descuento por puntos</span>
            <span className="font-medium text-emerald-700">
              - {currency.format(Number(venta.descuento_puntos))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Impuesto (IVA)</span>
            <span className="font-medium">
              {currency.format(Number(venta.impuesto))}
            </span>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
            <span className="text-gray-800 font-semibold">Total</span>
            <span className="text-gray-900 font-bold">
              {currency.format(Number(venta.total))}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Puntos ganados: {venta.puntos_ganados}
          </p>
        </div>
      </section>

      {/* Info + Pagos */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Info adicional */}
        <div className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Información de la venta
          </h2>
          <p className="text-gray-600">
            ID interno: <span className="font-mono">{venta.id}</span>
          </p>
          <p className="text-gray-600">
            Fecha de creación:{" "}
            {new Date(venta.fecha_creacion).toLocaleString("es-CR")}
          </p>
          <p className="text-gray-600">
            Sucursal: {venta.sucursal_nombre}
          </p>
          <p className="text-gray-600">
            Vendedor: {venta.vendedor_nombre}
          </p>
          <p className="text-gray-600">
            Cliente en ticket: {venta.nombre_cliente_ticket || "Anónimo"}
          </p>
        </div>

        {/* Pagos */}
        <div className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Pagos registrados
          </h2>
          {venta.pagos.length === 0 ? (
            <p className="text-gray-400 text-[11px]">
              No hay pagos registrados para esta venta.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {venta.pagos.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-start border border-gray-100 rounded-xl p-2"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {p.metodo}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Fecha:{" "}
                      {new Date(p.fecha).toLocaleString("es-CR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    {p.referencia && (
                      <p className="text-[11px] text-gray-500">
                        Ref: {p.referencia}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-gray-700">
                    <div className="font-semibold">
                      {currency.format(Number(p.monto))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Productos */}
      <section className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
        <h2 className="text-sm font-semibold text-gray-800">
          Productos de la venta
        </h2>
        {venta.items.length === 0 ? (
          <p className="text-gray-400 text-[11px]">
            No hay productos asociados a esta venta.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto pr-1">
            {venta.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border border-gray-100 rounded-xl p-2"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {item.nombre_producto || `Producto #${item.producto_id}`}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Cantidad: {item.cantidad}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Precio unitario:{" "}
                    {currency.format(Number(item.precio_unitario))}
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-700">
                  <div className="font-semibold">
                    {currency.format(Number(item.subtotal))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}