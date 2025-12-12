// frontend/app/account/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { CancelarPedidoModal } from "@/components/CancelarPedidoModal";
import { useNotifications } from "@/app/context/NotificationContext";

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
  const { error: showError } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);
  const [pedidoACancelar, setPedidoACancelar] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);

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
      showError(
        "Error al cargar",
        err?.message || "No se pudo cargar el historial de pedidos"
      );
    } finally {
      setLoading(false);
    }
  }

  function getEstadoColor(estado: string, cancelado: boolean) {
    if (cancelado) return "bg-gray-100 text-gray-700 border-gray-300";

    switch (estado) {
      case "PAGADO":
        return "bg-green-100 text-green-700 border-green-300";
      case "EN_PREPARACION":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "ENVIADO":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "ENTREGADO":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "CANCELADO":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
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
    if (pedido.cancelado) return false;
    if (pedido.estado === "ENVIADO") return false;
    if (pedido.estado === "ENTREGADO") return false;
    if (pedido.estado === "CERRADO") return false;
    if (pedido.estado === "CANCELADO") return false;
    return true;
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      <MainMenu />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 pt-[140px]">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center py-3 gap-2 mb-6 text-sm">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Inicio
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push("/account/profile")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mi cuenta
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Mis pedidos
          </span>
        </div>

        {/* Título */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#6b21a8] mb-2">
            Historial de pedidos
          </h1>
          <p className="text-sm text-gray-600">
            Aquí puedes ver tus compras recientes realizadas en JYA Innersport.
          </p>
        </div>

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
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#a855f7] hover:bg-[#7e22ce] !text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Ir a comprar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map((pedido) => (
              <div
                key={pedido.id}
                className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-[#a855f7]/30 transition-all"
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
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getEstadoColor(
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
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-[#a855f7] text-[#a855f7] text-xs font-semibold hover:bg-[#a855f7] hover:text-white transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver Detalles
                    </button>

                    {/* Botón Cancelar - solo si puede cancelar */}
                    {puedeCancelar(pedido) && (
                      <button
                        onClick={() => setPedidoACancelar(pedido.id)}
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 border-2 border-red-200 hover:border-red-300 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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

      <RecommendedFooter />

      {/* Modal de cancelación */}
      {pedidoACancelar !== null && (
        <CancelarPedidoModal
          pedidoId={pedidoACancelar}
          onClose={() => setPedidoACancelar(null)}
          onSuccess={() => {
            setPedidoACancelar(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}