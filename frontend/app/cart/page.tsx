// frontend/app/cart/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../context/cartContext";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { useNotifications } from "@/app/context/NotificationContext";

type PuntosInfo = {
  puede_usar_puntos: boolean;
  motivo: string | null;
  descuento_maximo_colones: string;
  puntos_necesarios_para_maximo: number;
  saldo_puntos: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const { success, error: showError, confirm } = useNotifications();

  const [puntosInfo, setPuntosInfo] = useState<PuntosInfo | null>(null);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [errorPuntos, setErrorPuntos] = useState<string | null>(null);

  const router = useRouter();
  const hasItems = items.length > 0;

  useEffect(() => {
    if (!hasItems) {
      setPuntosInfo(null);
      return;
    }

    async function fetchPuntos() {
      try {
        setLoadingPuntos(true);
        const res = await fetch(
          `${API_BASE_URL}/api/v1/cart/me/puntos/limite`,
          { credentials: "include" }
        );

        if (!res.ok) throw new Error();

        const data = (await res.json()) as PuntosInfo;
        setPuntosInfo(data);
        setErrorPuntos(null);
      } catch {
        setErrorPuntos("No se pudo obtener la información de puntos.");
      } finally {
        setLoadingPuntos(false);
      }
    }

    fetchPuntos();
  }, [hasItems]);

  const handleClearCart = () => {
    confirm(
      "Vaciar carrito",
      "¿Estás seguro de que deseas eliminar todos los productos del carrito?",
      () => {
        clearCart();
        success("Carrito vaciado", "Todos los productos han sido eliminados");
      },
      "Sí, vaciar"
    );
  };

  const handleRemoveItem = (itemId: number, itemName: string) => {
    confirm(
      "Eliminar producto",
      `¿Deseas eliminar "${itemName}" del carrito?`,
      () => {
        removeItem(itemId);
        success("Producto eliminado", "El producto ha sido eliminado del carrito");
      },
      "Sí, eliminar"
    );
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      <MainMenu />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-[140px] pb-10">
        {/* Breadcrumb mejorado - igual que orders/page.tsx */}
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
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Carrito
          </span>
        </div>

        {/* Título */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#6b21a8] mb-2">
            Carrito de compras
          </h1>
          <p className="text-sm text-gray-600">
            {hasItems
              ? `Tienes ${items.length} producto${items.length === 1 ? "" : "s"} en tu carrito`
              : "No hay productos en tu carrito"}
          </p>
        </div>

        {!hasItems && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">🛒</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Descubre nuestros productos y comienza a agregar artículos a tu carrito.
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#a855f7] hover:bg-[#7e22ce] !text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Ver productos
            </button>
          </div>
        )}

        {hasItems && (
          <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
            {/* LISTA DE ITEMS */}
            <div className="space-y-4">
              {items.map((item) => {
                const maxQty =
                  item.stockDisponible !== undefined &&
                  item.stockDisponible !== null
                    ? item.stockDisponible
                    : Infinity;

                const atMax = maxQty !== Infinity && item.quantity >= maxQty;

                const handleQtyChange = (rawValue: number) => {
                  let value = Number(rawValue) || 1;
                  if (value < 1) value = 1;
                  if (maxQty !== Infinity && value > maxQty) {
                    value = maxQty;
                    showError(
                      "Stock insuficiente",
                      `Solo hay ${maxQty} unidades disponibles`
                    );
                  }
                  updateQuantity(item.id, value);
                };

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm hover:shadow-lg hover:border-[#a855f7]/30 transition-all"
                  >
                    {/* IZQUIERDA: imagen + info */}
                    <div className="flex items-center gap-3 flex-1">
                      {item.imagenUrl ? (
                        <img
                          src={buildMediaUrl(item.imagenUrl) ?? ""}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200 bg-gray-50"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                          📦
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-sm">{item.name}</p>

                        {item.brand && (
                          <p className="text-xs text-gray-500">
                            {item.brand}
                          </p>
                        )}

                        {(item.color || item.talla) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.color && <>Color: {item.color}</>}
                            {item.color && item.talla && " · "}
                            {item.talla && <>Talla: {item.talla}</>}
                          </p>
                        )}

                        <p className="mt-1 text-sm text-[#6b21a8] font-semibold">
                          ₡{item.price.toLocaleString("es-CR")}
                        </p>

                        {maxQty !== Infinity && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            Stock disponible: {maxQty} unidad
                            {maxQty === 1 ? "" : "es"}
                          </p>
                        )}
                        {atMax && (
                          <p className="text-[11px] text-red-500">
                            Alcanzaste el máximo según stock.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* DERECHA: controles */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQtyChange(item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 rounded border bg-white text-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleQtyChange(Number(e.target.value))
                          }
                          className="w-16 rounded border px-2 py-1 text-center text-sm"
                        />

                        <button
                          onClick={() =>
                            handleQtyChange(item.quantity + 1)
                          }
                          disabled={atMax}
                          className={`h-8 w-8 rounded border bg-white text-lg hover:bg-gray-100 transition-colors ${
                            atMax
                              ? "opacity-40 cursor-not-allowed hover:bg-white"
                              : ""
                          }`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.id, item.name)}
                        className="flex items-center justify-center rounded-lg border-2 border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RESUMEN */}
            <div className="space-y-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm h-fit">
              <h2 className="text-lg font-semibold text-[#6b21a8]">Resumen del pedido</h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    ₡{total.toLocaleString("es-CR")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Productos</span>
                  <span className="font-medium">
                    {items.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-[#6b21a8]">
                    ₡{total.toLocaleString("es-CR")}
                  </span>
                </div>
              </div>

              <button
                onClick={handleClearCart}
                className="w-full rounded-lg border-2 border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
              >
                Vaciar carrito
              </button>

              <button
                onClick={() => router.push("/checkout")}
                className="w-full rounded-lg bg-[#a855f7] px-4 py-2.5 text-sm font-semibold !text-white hover:bg-[#7e22ce] shadow-lg shadow-purple-500/30 transition-all"
              >
                Proceder al pago
              </button>

              {errorPuntos && (
                <p className="text-[11px] text-red-500 mt-2">
                  {errorPuntos}
                </p>
              )}
              {loadingPuntos && (
                <p className="text-[11px] text-gray-500 mt-2">
                  Cargando información de puntos...
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <RecommendedFooter />
    </div>
  );
}