// frontend/app/cart/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../context/cartContext";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";

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

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      {/* más espacio arriba por el header fijo */}
      <main className="max-w-4xl mx-auto px-4 pt-40 pb-10">
        <div className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:underline">
            Inicio
          </Link>
          <span className="mx-1">›</span>
          <span className="text-gray-800 font-medium">Carrito</span>
        </div>

        <h1 className="text-2xl font-bold mb-4">Carrito de compras</h1>

        {!hasItems && (
          <div className="rounded-lg border bg-white p-6 text-center">
            <p className="mb-4 text-gray-600">Tu carrito está vacío.</p>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-[#a855f7] px-4 py-2 text-sm font-medium text-white hover:bg-[#7e22ce]"
            >
              Ver productos
            </Link>
          </div>
        )}

        {hasItems && (
          <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
            {/* LISTA DE ITEMS */}
            <div className="space-y-4">
              {items.map((item) => {
                // límite según stock disponible
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
                  }
                  updateQuantity(item.id, value);
                };

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-white p-4"
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

                        {/* Info de stock */}
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
                          className="h-8 w-8 rounded border bg-white text-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          className={`h-8 w-8 rounded border bg-white text-lg hover:bg-gray-100 ${atMax
                              ? "opacity-40 cursor-not-allowed hover:bg-white"
                              : ""
                            }`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RESUMEN */}
            <div className="space-y-4 rounded-lg border bg-white p-4">
              <h2 className="text-lg font-semibold">Resumen</h2>

              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">
                  ₡{total.toLocaleString("es-CR")}
                </span>
              </div>

              {/* Puedes usar puntosInfo aquí si quieres mostrar algo al cliente */}

              <button
                onClick={clearCart}
                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Vaciar carrito
              </button>

              <button
                onClick={() => router.push("/checkout")}
                className="w-full rounded-lg bg-[#a855f7] px-4 py-2 text-sm font-medium text-white hover:bg-[#7e22ce]"
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
    </div>
  );
}
