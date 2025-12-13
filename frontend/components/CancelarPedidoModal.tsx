//frontend/components/CancelarPedidoModal.tsx

"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/app/context/NotificationContext";

type ImpactoCancelacion = {
  puede_cancelar: boolean;
  motivo_bloqueo: string | null;
  advertencias: string[];
  impacto_stock: boolean;
  mensaje: string;
};

type CancelarPedidoModalProps = {
  pedidoId: number;
  onClose: () => void;
  onSuccess: () => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function CancelarPedidoModal({
  pedidoId,
  onClose,
  onSuccess,
}: CancelarPedidoModalProps) {
  const { success, error: showError } = useNotifications();
  
  const [paso, setPaso] = useState<"verificando" | "advertencia" | "formulario">(
    "verificando"
  );
  const [impacto, setImpacto] = useState<ImpactoCancelacion | null>(null);
  const [motivo, setMotivo] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si se puede cancelar al montar el componente
  useEffect(() => {
    verificarCancelacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  async function verificarCancelacion() {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/pedidos/${pedidoId}/verificar-cancelacion`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Error al verificar cancelación");
      }

      const data: ImpactoCancelacion = await res.json();
      setImpacto(data);

      // Si no puede cancelar, mostrar error inmediatamente
      if (!data.puede_cancelar) {
        setError(data.motivo_bloqueo || "No se puede cancelar este pedido");
        setPaso("advertencia");
      } else if (data.advertencias.length > 0) {
        // Si hay advertencias, mostrarlas
        setPaso("advertencia");
      } else {
        // Si no hay advertencias, ir directo al formulario
        setPaso("formulario");
      }
    } catch (err: any) {
      setError(err.message || "Error al verificar cancelación");
      setPaso("advertencia");
    }
  }

  async function handleCancelar() {
    if (motivo.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres");
      return;
    }

    try {
      setCancelando(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/v1/pedidos/${pedidoId}/cancelar`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ motivo }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Error al cancelar pedido");
      }

      const data = await res.json();

      // Mostrar notificación de éxito usando NotificationContext
      success(
        "Pedido cancelado",
        data.mensaje || "Tu pedido ha sido cancelado exitosamente"
      );

      // Cerrar modal y notificar éxito
      onSuccess();
    } catch (err: any) {
      // Mostrar error en el modal y también como notificación
      const errorMsg = err.message || "Error al cancelar pedido";
      setError(errorMsg);
      showError("Error al cancelar", errorMsg);
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Cancelar Pedido #{pedidoId}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Paso 1: Verificando */}
          {paso === "verificando" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-600">
                Verificando si el pedido puede ser cancelado...
              </p>
            </div>
          )}

          {/* Paso 2: Advertencias o Error */}
          {paso === "advertencia" && impacto && (
            <div className="space-y-4">
              {!impacto.puede_cancelar && error ? (
                // Error - no se puede cancelar
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          No se puede cancelar
                        </p>
                        <p className="text-xs text-red-700 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700 transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              ) : (
                // Advertencias
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-900 mb-2">
                      {impacto.mensaje}
                    </p>
                    {impacto.advertencias.length > 0 && (
                      <ul className="space-y-2 mt-3">
                        {impacto.advertencias.map((adv, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-amber-800 flex items-start gap-2"
                          >
                            <span className="text-amber-600 flex-shrink-0 mt-0.5">
                              •
                            </span>
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setPaso("formulario")}
                      className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Paso 3: Formulario */}
          {paso === "formulario" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de cancelación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={cancelando}
                  placeholder="Explica el motivo de la cancelación (mínimo 10 caracteres)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {motivo.length}/500 caracteres
                  {motivo.length < 10 && (
                    <span className="text-red-500 ml-2">
                      (mínimo 10 caracteres)
                    </span>
                  )}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  <strong>Importante:</strong> Esta acción no se puede deshacer.
                  El pedido será cancelado permanentemente.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  disabled={cancelando}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Volver
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={cancelando || motivo.trim().length < 10}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {cancelando ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Cancelando...
                    </span>
                  ) : (
                    "Cancelar Pedido"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}