// frontend/app/cart/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../context/cartContext";

type PuntosInfo = {
  puede_usar_puntos: boolean;
  motivo: string | null;
  descuento_maximo_colones: string; // viene como string desde el backend (Decimal)
  puntos_necesarios_para_maximo: number;
  saldo_puntos: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();

  const [puntosInfo, setPuntosInfo] = useState<PuntosInfo | null>(null);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [errorPuntos, setErrorPuntos] = useState<string | null>(null);

  const hasItems = items.length > 0;

  // 🔹 Cargar info de puntos SOLO si hay items en el carrito
  useEffect(() => {
    if (!hasItems) {
      setPuntosInfo(null);
      return;
    }

    async function fetchPuntos() {
      try {
        setLoadingPuntos(true);
        setErrorPuntos(null);

        const res = await fetch(
          `${API_BASE_URL}/api/v1/cart/me/puntos/limite`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error("No se pudo obtener la información de puntos.");
        }

        const data = (await res.json()) as PuntosInfo;
        setPuntosInfo(data);
      } catch (err: any) {
        console.error(err);
        setErrorPuntos(
          err?.message ?? "No se pudo obtener la información de puntos."
        );
      } finally {
        setLoadingPuntos(false);
      }
    }

    fetchPuntos();
  }, [hasItems]);

  // 👀 Regla: si el programa está inactivo, NO mostrar el bloque
  const mostrarBloquePuntos =
    hasItems &&
    puntosInfo &&
    !(
      !puntosInfo.puede_usar_puntos &&
      puntosInfo.motivo === "El programa de puntos está inactivo."
    );

  function formatColonAmount(value: number | string) {
    const num = typeof value === "string" ? Number(value) : value;
    if (isNaN(num)) return "₡0";
    return `₡${num.toLocaleString("es-CR")}`;
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:underline">
            Inicio
          </Link>{" "}
          <span className="mx-1">›</span>{" "}
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
            {/* Lista de items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.brand && (
                      <p className="text-xs text-gray-500">{item.brand}</p>
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
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="h-8 w-8 rounded border bg-white text-lg leading-none hover:bg-gray-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.id,
                            Number(e.target.value) || 1
                          )
                        }
                        className="w-16 rounded border px-2 py-1 text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="h-8 w-8 rounded border bg-white text-lg leading-none hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Eliminar del carrito"
                      aria-label="Eliminar del carrito"
                      className="flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-base text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen */}
            <div className="space-y-4 rounded-lg border bg-white p-4">
              <h2 className="text-lg font-semibold">Resumen</h2>
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">
                  ₡{total.toLocaleString("es-CR")}
                </span>
              </div>

              {/* 🔹 Bloque de puntos: solo se muestra si el programa NO está inactivo */}
              {mostrarBloquePuntos && (
                <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs space-y-1">
                  <p className="font-semibold text-gray-800">
                    Programa de puntos
                  </p>

                  {loadingPuntos && (
                    <p className="text-gray-500 text-[11px]">
                      Cargando información de puntos...
                    </p>
                  )}

                  {errorPuntos && (
                    <p className="text-red-600 text-[11px]">
                      {errorPuntos}
                    </p>
                  )}

                  {!loadingPuntos && !errorPuntos && puntosInfo && (
                    <>
                      <p className="text-gray-700">
                        Saldo:{" "}
                        <span className="font-semibold">
                          {puntosInfo.saldo_puntos} pts
                        </span>
                      </p>

                      {!puntosInfo.puede_usar_puntos && puntosInfo.motivo && (
                        <p className="text-[11px] text-gray-500">
                          {puntosInfo.motivo}
                        </p>
                      )}

                      {puntosInfo.puede_usar_puntos && (
                        <div className="space-y-1 text-[11px] text-gray-600">
                          <p>
                            Descuento máximo con puntos en esta compra:{" "}
                            <span className="font-semibold">
                              {formatColonAmount(
                                puntosInfo.descuento_maximo_colones
                              )}
                            </span>
                          </p>
                          <p>
                            Puntos necesarios para ese máximo:{" "}
                            <span className="font-semibold">
                              {puntosInfo.puntos_necesarios_para_maximo} pts
                            </span>
                          </p>
                          {/* Aquí después puedes agregar el input/botón para decidir cuántos puntos usar */}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={clearCart}
                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Vaciar carrito
              </button>

              <button
                type="button"
                className="w-full rounded-lg bg-[#a855f7] px-4 py-2 text-sm font-medium text-white hover:bg-[#7e22ce]"
              >
                Proceder al pago
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}