// frontend/app/admin/pedidos/[id]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ProductImage } from "@/components/ProductImage";
import { useNotifications } from "@/app/context/NotificationContext";

type DireccionEnvio = {
  provincia: string;
  canton: string;
  distrito: string;
  detalle: string;
  pais: string;
  codigo_postal: string;
  telefono: string;
  nombre: string;
  referencia: string;
};

type ProductoPedido = {
  id: number;
  nombre: string;
  imagen_url: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
};

type PedidoDetalle = {
  id: number;
  numero_pedido: string;
  fecha: string;
  estado: string;
  subtotal: number;
  costo_envio: number;
  descuento_puntos: number;
  total: number;
  puntos_ganados: number;
  metodo_envio: string;
  direccion_envio: DireccionEnvio | null;
  productos: ProductoPedido[];
  puede_cancelar: boolean;
  fecha_limite_cancelacion: string | null;
};

const ESTADOS_PEDIDO = [
  "PAGADO",
  "EN_PREPARACION",
  "ENVIADO",
  "ENTREGADO",
  "CANCELADO",
];

export default function PedidoDetalleAdminPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError, confirm } = useNotifications();
  const id = Number(params?.id);

  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoLocal, setEstadoLocal] = useState<string>("");
  const [savingEstado, setSavingEstado] = useState(false);

  async function loadPedido() {
    try {
      setLoading(true);
      setError(null);
      const data = (await apiFetch(`/api/v1/pedidos/${id}`, {
        method: "GET",
      })) as PedidoDetalle;
      setPedido(data);
      setEstadoLocal(data.estado);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.message ?? "Error al cargar el pedido";
      setError(errorMsg);
      showError("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isNaN(id)) {
      loadPedido();
    }
  }, [id]);

  async function handleCambiarEstado(e: FormEvent) {
    e.preventDefault();
    if (!pedido) return;

    // Confirmar cambio de estado
    confirm(
      "Confirmar cambio de estado",
      `¿Estás seguro de cambiar el estado del pedido a ${estadoLocal}? Se enviará un correo automático al cliente.`,
      async () => {
        try {
          setSavingEstado(true);
          setError(null);

          await apiFetch(`/api/v1/pedidos/${pedido.id}/estado`, {
            method: "PATCH",
            body: JSON.stringify({ estado: estadoLocal }),
          });

          await loadPedido();
          success(
            "Estado actualizado",
            "El estado del pedido se ha actualizado y se ha enviado un correo al cliente."
          );
        } catch (err: any) {
          console.error(err);
          const errorMsg = err?.message ?? "Error al actualizar el estado del pedido";
          setError(errorMsg);
          showError("Error al actualizar", errorMsg);
        } finally {
          setSavingEstado(false);
        }
      },
      "Actualizar estado"
    );
  }

  if (loading) {
    return (
      <div className="py-6 text-center text-xs text-gray-500">
        Cargando pedido...
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-red-600">
          {error || "No se pudo cargar el pedido"}
        </p>
        <button
          onClick={() => router.push("/admin/pedidos")}
          className="text-xs text-[#6b21a8] underline"
        >
          Volver a la lista de pedidos
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
            Pedido {pedido.numero_pedido || `#${pedido.id}`}
          </h1>
          <p className="text-xs text-gray-500">
            Creado el{" "}
            {new Date(pedido.fecha).toLocaleString("es-CR")}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/pedidos")}
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
            Estado del pedido
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
                {ESTADOS_PEDIDO.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-500">
              Al cambiar el estado se enviará un correo automático al cliente
              con la actualización.
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={savingEstado || estadoLocal === pedido.estado}
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
              ₡{Number(pedido.subtotal).toLocaleString("es-CR")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Envío</span>
            <span className="font-medium">
              ₡{Number(pedido.costo_envio).toLocaleString("es-CR")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Descuento puntos</span>
            <span className="font-medium text-emerald-700">
              - ₡{Number(pedido.descuento_puntos).toLocaleString("es-CR")}
            </span>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
            <span className="text-gray-800 font-semibold">Total</span>
            <span className="text-gray-900 font-bold">
              ₡{Number(pedido.total).toLocaleString("es-CR")}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Método de envío: {pedido.metodo_envio}
          </p>
          <p className="text-[11px] text-gray-500">
            Puntos ganados: {pedido.puntos_ganados}
          </p>
        </div>
      </section>

      {/* Dirección e items */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Dirección */}
        <div className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Dirección de envío
          </h2>
          {pedido.direccion_envio ? (
            <>
              <p className="text-gray-800">
                {pedido.direccion_envio.nombre || "Sin nombre"}
              </p>
              <p className="text-gray-600">
                {pedido.direccion_envio.detalle}
              </p>
              <p className="text-gray-600">
                {pedido.direccion_envio.distrito},{" "}
                {pedido.direccion_envio.canton},{" "}
                {pedido.direccion_envio.provincia}
              </p>
              <p className="text-gray-600">
                {pedido.direccion_envio.pais} ·{" "}
                {pedido.direccion_envio.codigo_postal}
              </p>
              <p className="text-gray-600">
                Tel: {pedido.direccion_envio.telefono}
              </p>
              {pedido.direccion_envio.referencia && (
                <p className="text-gray-500 text-[11px]">
                  Ref: {pedido.direccion_envio.referencia}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-[11px]">
              Sin dirección registrada.
            </p>
          )}
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Productos del pedido
          </h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {pedido.productos.map((prod) => (
              <div
                key={prod.id}
                className="flex items-center gap-3 border border-gray-100 rounded-xl p-2"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                  <ProductImage
                    src={prod.imagen_url}
                    alt={prod.nombre}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {prod.nombre}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Cantidad: {prod.cantidad}
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-700">
                  <div>
                    ₡{prod.precio_unitario.toLocaleString("es-CR")}
                  </div>
                  <div className="font-semibold">
                    ₡{prod.subtotal.toLocaleString("es-CR")}
                  </div>
                </div>
              </div>
            ))}
            {pedido.productos.length === 0 && (
              <p className="text-gray-400 text-[11px]">
                No hay productos asociados al pedido.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}