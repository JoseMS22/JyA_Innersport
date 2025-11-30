"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

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
  direccion_exacta: string;
  telefono: string;
  nombre_contacto: string;
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
}

const ESTADOS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDIENTE: { label: "Pendiente", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  CONFIRMADO: { label: "Confirmado", color: "text-blue-700", bgColor: "bg-blue-100" },
  EN_PROCESO: { label: "En Proceso", color: "text-purple-700", bgColor: "bg-purple-100" },
  ENVIADO: { label: "Enviado", color: "text-indigo-700", bgColor: "bg-indigo-100" },
  ENTREGADO: { label: "Entregado", color: "text-green-700", bgColor: "bg-green-100" },
  CANCELADO: { label: "Cancelado", color: "text-red-700", bgColor: "bg-red-100" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
          setError("Pedido no encontrado");
        } else {
          setError("Error al cargar el pedido");
        }
        return;
      }

      const data = await res.json();
      setPedido(data);
    } catch (err) {
      console.error("Error:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!cancelReason.trim()) {
      alert("Por favor ingresa un motivo de cancelación");
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

      alert("Pedido cancelado exitosamente");
      setShowCancelModal(false);
      fetchPedidoDetalle();
    } catch (err: any) {
      console.error("Error:", err);
      alert(err.message || "Error al cancelar el pedido");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
          <button
            onClick={() => router.push("/account/orders")}
            className="text-purple-600 hover:text-purple-700 font-medium"
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
    bgColor: "bg-gray-100",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push("/account/orders")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <span className="mr-2">←</span>
            Volver a Mis Pedidos
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
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
            <div className="mt-4 sm:mt-0">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${estadoConfig.bgColor} ${estadoConfig.color}`}>
                {estadoConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📦</span>
                Productos ({pedido.productos.length})
              </h2>

              <div className="space-y-4">
                {pedido.productos.map((producto) => (
                  <div key={producto.id} className="flex items-start space-x-4 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={producto.imagen_url || "/placeholder.png"}
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

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📍</span>
                Dirección de Envío
              </h2>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{pedido.direccion_envio.nombre_contacto}</p>
                <p className="text-gray-600">{pedido.direccion_envio.telefono}</p>
                <p className="text-gray-600">
                  {pedido.direccion_envio.provincia}, {pedido.direccion_envio.canton}, {pedido.direccion_envio.distrito}
                </p>
                <p className="text-gray-600">{pedido.direccion_envio.direccion_exacta}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
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

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
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

            {pedido.puntos_ganados > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-6 border border-purple-100">
                <div className="flex items-center mb-2">
                  <span className="mr-2">⭐</span>
                  <h3 className="font-semibold text-gray-900">Puntos Acumulados</h3>
                </div>
                <p className="text-3xl font-bold text-purple-600">+{pedido.puntos_ganados}</p>
                <p className="text-sm text-gray-600 mt-1">puntos agregados a tu cuenta</p>
              </div>
            )}

            {pedido.puede_cancelar && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Cancelar Pedido
                </button>
                {pedido.fecha_limite_cancelacion && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Puedes cancelar hasta el {new Date(pedido.fecha_limite_cancelacion).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
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

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={canceling}
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={canceling || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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