// frontend/app/account/orders/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { ProductImage } from "@/components/ProductImage";
import { useNotifications } from "@/app/context/NotificationContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Producto {
  id: number;
  nombre: string;
  imagen_url: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

interface Direccion {
  provincia: string;
  canton: string;
  distrito: string;
  detalle: string;
  pais: string;
  codigo_postal: string;
  telefono: string;
  nombre: string;
  referencia: string;
}

interface RMA {
  id: number;
  tipo: string;
  estado: string;
  motivo: string;
  respuesta_admin?: string;
  fecha: string;
}

interface PedidoDetalle {
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
  direccion_envio: Direccion;
  productos: Producto[];
  puede_cancelar: boolean;
  fecha_limite_cancelacion?: string;
  tiene_rma_activo?: boolean;
  solicitudes_rma?: RMA[];
}

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDIENTE: { label: "Pendiente", color: "text-yellow-700", bgColor: "bg-yellow-100 border-yellow-300" },
  CONFIRMADO: { label: "Confirmado", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-300" },
  EN_PROCESO: { label: "En Proceso", color: "text-purple-700", bgColor: "bg-purple-100 border-purple-300" },
  ENVIADO: { label: "Enviado", color: "text-indigo-700", bgColor: "bg-indigo-100 border-indigo-300" },
  ENTREGADO: { label: "Entregado", color: "text-green-700", bgColor: "bg-green-100 border-green-300" },
  CANCELADO: { label: "Cancelado", color: "text-red-700", bgColor: "bg-red-100 border-red-300" },
  PAGADO: { label: "Pagado", color: "text-green-700", bgColor: "bg-green-100 border-green-300" },
};

const ESTADOS_RMA_CLIENTE: Record<string, { label: string; color: string }> = {
  solicitado: { label: "Solicitud Recibida", color: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  en_revision: { label: "En Revisión", color: "bg-blue-50 text-blue-800 border-blue-200" },
  aprobado: { label: "✅ Solicitud Aprobada", color: "bg-green-50 text-green-800 border-green-200" },
  rechazado: { label: "❌ Solicitud Rechazada", color: "bg-red-50 text-red-800 border-red-200" },
  completado: { label: "Devolución Completada", color: "bg-gray-50 text-gray-800 border-gray-200" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { success, error: showError, confirm } = useNotifications();

  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchPedidoDetalle();
  }, [orderId]);

  const fetchPedidoDetalle = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/pedidos/${orderId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) {
          showError("Pedido no encontrado", "No se pudo encontrar el pedido solicitado");
        } else {
          showError("Error al cargar", "No se pudo cargar el detalle del pedido");
        }
        return;
      }

      const data = await res.json();
      setPedido(data);
    } catch (err) {
      console.error("Error:", err);
      showError("Error de conexión", "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!cancelReason.trim()) {
      showError("Motivo requerido", "Por favor ingresa un motivo de cancelación");
      return;
    }

    try {
      setCanceling(true);
      const res = await fetch(`${API_BASE}/api/v1/pedidos/${orderId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ motivo: cancelReason }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Error al cancelar");
      }

      success("Pedido cancelado", "Tu pedido ha sido cancelado exitosamente");
      setShowCancelModal(false);
      fetchPedidoDetalle();
    } catch (err: any) {
      console.error("Error:", err);
      showError("Error al cancelar", err.message || "No se pudo cancelar el pedido");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-600">Cargando detalle del pedido...</p>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Pedido no encontrado</h2>
          <button
            onClick={() => router.push("/account/orders")}
            className="text-[#a855f7] hover:text-[#7e22ce] font-medium"
          >
            ← Volver a Mis Pedidos
          </button>
        </div>
      </div>
    );
  }

  const estadoConfig = ESTADOS_CONFIG[pedido.estado] || {
    label: pedido.estado,
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-300",
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      <MainMenu />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 pt-[140px]">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center gap-2 py-3 mb-6 text-sm flex-wrap">
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
          <button
            onClick={() => router.push("/account/orders")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Mis pedidos
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Pedido #{pedido.numero_pedido}
          </span>
        </div>

        {/* Header del pedido */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido #{pedido.numero_pedido}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Realizado el {new Date(pedido.fecha).toLocaleDateString("es-CR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border-2 ${estadoConfig.bgColor} ${estadoConfig.color}`}>
              {estadoConfig.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLUMNA IZQUIERDA: DETALLES PRODUCTOS Y DIRECCIÓN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Productos */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📦</span>
                Productos ({pedido.productos.length})
              </h2>

              <div className="space-y-4">
                {pedido.productos.map((producto) => (
                  <div key={producto.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <ProductImage
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">{producto.nombre}</h3>
                      <p className="text-sm text-gray-500 mt-1">Cantidad: {producto.cantidad}</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">₡{producto.precio_unitario.toLocaleString()} c/u</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₡{producto.subtotal.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dirección de envío */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📍</span>
                Dirección de Envío
              </h2>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{pedido.direccion_envio.nombre}</p>
                <p className="text-gray-600">{pedido.direccion_envio.telefono}</p>
                <p className="text-gray-600">
                  {pedido.direccion_envio.provincia}, {pedido.direccion_envio.canton}, {pedido.direccion_envio.distrito}
                </p>
                <p className="text-gray-600">{pedido.direccion_envio.detalle}</p>
                {pedido.direccion_envio.referencia && (
                  <p className="text-gray-500 text-xs">Referencia: {pedido.direccion_envio.referencia}</p>
                )}
              </div>
            </div>

            {/* Método de envío */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🚚</span>
                Método de Envío
              </h2>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{pedido.metodo_envio}</p>
                <p className="text-sm font-semibold text-gray-900">₡{pedido.costo_envio.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: RESUMEN Y ACCIONES */}
          <div className="space-y-6">
            {/* Resumen */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Pedido</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₡{pedido.subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Envío:</span>
                  <span className="font-medium">₡{pedido.costo_envio.toLocaleString()}</span>
                </div>

                {pedido.descuento_puntos > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento por puntos:</span>
                    <span className="font-medium">-₡{pedido.descuento_puntos.toLocaleString()}</span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-purple-600">₡{pedido.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Puntos ganados */}
            {pedido.puntos_ganados > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-sm p-6 border-2 border-purple-200">
                <div className="flex items-center mb-2">
                  <span className="mr-2">⭐</span>
                  <h3 className="font-semibold text-gray-900">Puntos Acumulados</h3>
                </div>
                <p className="text-3xl font-bold text-purple-600">+{pedido.puntos_ganados}</p>
                <p className="text-sm text-gray-600 mt-1">puntos agregados a tu cuenta</p>
              </div>
            )}

            {/* Botón cancelar */}
            {pedido.puede_cancelar && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 !text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-lg shadow-red-500/30"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar Pedido
                </button>
                {pedido.fecha_limite_cancelacion && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Puedes cancelar hasta el {new Date(pedido.fecha_limite_cancelacion).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* SECCIÓN DE DEVOLUCIONES / RMA */}
            <div className="space-y-4">

              {/* Historial de solicitudes */}
              {pedido.solicitudes_rma && pedido.solicitudes_rma.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Estado de Devoluciones</h3>
                  <div className="space-y-4">
                    {pedido.solicitudes_rma.map((rma) => {
                      const config = ESTADOS_RMA_CLIENTE[rma.estado.toLowerCase()] ||
                        { label: rma.estado, color: "bg-gray-100 border-gray-200" };

                      return (
                        <div key={rma.id} className={`p-4 rounded-lg border-2 ${config.color}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-xs uppercase tracking-wide">{config.label}</span>
                            <span className="text-[10px] opacity-75">{new Date(rma.fecha).toLocaleDateString()}</span>
                          </div>

                          <p className="text-sm mb-1 font-medium">
                            {rma.tipo === 'devolucion' ? 'Solicitud de Reembolso' : 'Solicitud de Cambio'}
                          </p>

                          <p className="text-xs italic mb-2 opacity-80">"{rma.motivo}"</p>

                          {rma.respuesta_admin && (
                            <div className="mt-3 bg-white/60 p-2 rounded text-xs border border-black/5">
                              <strong>Respuesta de la tienda:</strong>
                              <p className="mt-1">{rma.respuesta_admin}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botón para nueva solicitud */}
              {pedido.estado === "ENTREGADO" && !pedido.tiene_rma_activo && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2">¿Problemas con tu pedido?</h3>
                  <button
                    onClick={() => router.push(`/account/orders/${orderId}/rma`)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 !text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-500/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                    </svg>
                    Solicitar Devolución o Cambio
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <RecommendedFooter />

      {/* Modal de cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cancelar Pedido #{pedido.numero_pedido}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de cancelación *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
                placeholder="Explica brevemente por qué deseas cancelar..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{cancelReason.length}/500 caracteres</p>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Esta acción no se puede deshacer. El pedido será cancelado permanentemente.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                disabled={canceling}
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={canceling || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 !text-white rounded-lg hover:bg-red-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
              >
                {canceling ? "Cancelando..." : "Cancelar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}