// frontend/app/favorites/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFavorites } from "../context/favoritesContext";
import { useCart } from "../context/cartContext";

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const { addItem } = useCart();
  const router = useRouter();

  const hasFavorites = favorites.length > 0;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Verificar sesión para permitir agregar al carrito
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });
        setIsLoggedIn(res.ok);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Auto-ocultar toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleAddFavoriteToCart = (fav: (typeof favorites)[number]) => {
    if (checkingAuth) {
      setToast({
        type: "error",
        message:
          "Estamos verificando tu sesión, inténtalo de nuevo en un momento.",
      });
      return;
    }

    if (!isLoggedIn) {
      setToast({
        type: "error",
        message: "Debes iniciar sesión para agregar productos al carrito.",
      });
      return;
    }

    const variante = {
      id: fav.id,
      precio_actual: fav.price,
    };

    const producto = {
      id: fav.productoId,
      nombre: fav.name,
      brand: fav.brand,
    };

    addItem(variante as any, producto as any, 1, fav.imagenUrl ?? null);

    setToast({
      type: "success",
      message: "El producto se añadió al carrito desde favoritos.",
    });
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:underline">
            Inicio
          </Link>{" "}
          <span className="mx-1">›</span>{" "}
          <span className="text-gray-800 font-medium">Favoritos</span>
        </div>

        <h1 className="text-2xl font-bold mb-4">Mis productos favoritos</h1>

        {!hasFavorites && (
          <div className="rounded-lg border bg-white p-6 text-center">
            <p className="mb-4 text-gray-600">
              Aún no has guardado productos en favoritos.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center rounded-lg bg-[#a855f7] px-4 py-2 text-sm font-medium text-white hover:bg-[#7e22ce]"
            >
              Ver productos
            </button>
          </div>
        )}

        {hasFavorites && (
          <div className="space-y-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div>
                  <p className="font-medium text-sm">{fav.name}</p>
                  {fav.brand && (
                    <p className="text-xs text-gray-500">{fav.brand}</p>
                  )}
                  <p className="mt-1 text-sm text-[#6b21a8] font-semibold">
                    ₡{fav.price.toLocaleString("es-CR")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddFavoriteToCart(fav)}
                    className="rounded-lg bg-[#a855f7] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7e22ce]"
                  >
                    Agregar al carrito
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFavorite(fav.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Toast flotante */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg text-xs border ${
              toast.type === "success"
                ? "bg-white/95 border-[#22c55e]/40 text-[#166534]"
                : "bg-white/95 border-[#f97316]/40 text-[#9a3412]"
            }`}
          >
            <span className="text-lg">
              {toast.type === "success" ? "✅" : "⚠️"}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {toast.type === "success"
                  ? "Acción realizada"
                  : "No se pudo completar"}
              </span>
              <span>{toast.message}</span>
              {toast.type === "error" && !isLoggedIn && (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="mt-1 self-start text-[11px] font-semibold text-[#6b21a8] hover:text-[#a855f7]"
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}