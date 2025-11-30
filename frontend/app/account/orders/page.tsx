// frontend/app/account/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { CancelarPedidoModal } from "@/components/CancelarPedidoModal";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type PedidoHistorial = {
  id: number;
  total: number | string;
  estado: string;
  fecha_creacion: string;
  cancelado: boolean;
};

export default function OrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pedidoACancelar, setPedidoACancelar] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/v1/pedidos/mis-pedidos`, {
        credentials: "include",
      });

      if (res.status === 401 || res.status === 403) {
        router.push("/login?redirect=/account/orders");
        return;
      }

      if (!res.ok) {
        throw new Error("Error cargando el historial de pedidos");
      }

      const data: PedidoHistorial[] = await res.json();
      setPedidos(data);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el historial de pedidos");
    } finally {
      setLoading(false);
    }
  }

  function getEstadoColor(estado: string, cancelado: boolean) {
    if (cancelado) return "bg-gray-100 text-gray-700";

    switch (estado) {
      case "PAGADO":
        return "bg-green-100 text-green-700";
      case "EN_PREPARACION":
        return "bg-blue-100 text-blue-700";
      case "ENVIADO":
        return "bg-purple-100 text-purple-700";
      case "ENTREGADO":
        return "bg-emerald-100 text-emerald-700";
      case "CANCELADO":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function getEstadoTexto(estado: string, cancelado: boolean) {
    if (cancelado) return "CANCELADO";
    
    switch (estado) {
      case "PAGADO":
        return "Pagado";
      case "EN_PREPARACION":
        return "En Preparación";
      case "ENVIADO":
        return "Enviado";
      case "ENTREGADO":
        return "Entregado";
      case "CANCELADO":
        return "Cancelado";
      default:
        return estado;
    }
  }

  function puedeCancelar(pedido: PedidoHistorial): boolean {
    // Solo se puede cancelar si no está cancelado y no está enviado/entregado/cerrado
    if (pedido.cancelado) return false;
    if (pedido.estado === "ENVIADO") return false;
    if (pedido.estado === "ENTREGADO") return false;
    if (pedido.estado === "CERRADO") return false;
    if (pedido.estado === "CANCELADO") return false;
    return true;
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-[140px]">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-4">
          <button
            onClick={() => router.push("/")}
            className="hover:text-[#6b21a8] hover:underline"
          >
            Inicio
          </button>
          <span className="mx-1">›</span>
          <button
            onClick={() => router.push("/account/profile")}
            className="hover:text-[#6b21a8] hover:underline"
          >
            Mi cuenta
          </button>
          <span className="mx-1">›</span>
          <span className="text-gray-800 font-medium">Mis pedidos</span>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-[#6b21a8] mb-2">
          Historial de pedidos
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Aquí puedes ver tus compras recientes realizadas en JYA Innersport.
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              Cargando historial de pedidos...
            </p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">📭</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Aún no tienes pedidos
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Cuando realices una compra, aparecerá aquí el detalle de tu
              pedido.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-[#a855f7] hover:bg-[#7e22ce] text-white text-sm font-medium rounded-xl"
            >
              Ir a comprar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header del pedido */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Pedido #{pedido.id}
                    </p>
                    <p className="text-sm text-gray-700">
                      {new Date(pedido.fecha_creacion).toLocaleString(
                        "es-CR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(
                      pedido.estado,
                      pedido.cancelado
                    )}`}
                  >
                    {getEstadoTexto(pedido.estado, pedido.cancelado)}
                  </span>
                </div>

                {/* Footer del pedido - Total y acciones */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-[#6b21a8]">
                      ₡
                      {Number(pedido.total).toLocaleString("es-CR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* Botón Ver Detalles */}
                    <button
                      onClick={() =>
                        router.push(`/account/orders/${pedido.id}`)
                      }
                      className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Ver Detalles
                    </button>

                    {/* Botón Cancelar - solo si puede cancelar */}
                    {puedeCancelar(pedido) && (
                      <button
                        onClick={() => setPedidoACancelar(pedido.id)}
                        className="px-4 py-2 rounded-full bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 border border-red-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de cancelación */}
      {pedidoACancelar !== null && (
        <CancelarPedidoModal
          pedidoId={pedidoACancelar}
          onClose={() => setPedidoACancelar(null)}
          onSuccess={() => {
            setPedidoACancelar(null);
            loadOrders(); // Recargar lista después de cancelar
          }}
        />
      )}
    </div>
  );
}