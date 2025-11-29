// frontend/app/favorites/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFavorites } from "../context/favoritesContext";
import { useCart } from "../context/cartContext";
import { MainMenu } from "@/components/MainMenu"; // 👈 IMPORTANTE

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type AuthAlertState = {
  message: string;
} | null;

export default function FavoritesPage() {
  const { favorites, removeFavorite, setUserId } = useFavorites();
  const { addItem } = useCart();
  const router = useRouter();

  const hasFavorites = favorites.length > 0;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [authAlert, setAuthAlert] = useState<AuthAlertState>(null);

  // 🌟 Verificar sesión
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          setIsLoggedIn(false);
          setUserId(null);
          return;
        }

        const data: UserMe = await res.json();
        setIsLoggedIn(true);
        setUserId(data.id);
      } catch {
        setIsLoggedIn(false);
        setUserId(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [setUserId]);

  // Auto ocultar toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const handleAddFavoriteToCart = (fav: (typeof favorites)[number]) => {
    if (checkingAuth) {
      setAuthAlert({
        message: "Estamos verificando tu sesión, inténtalo de nuevo en un momento.",
      });
      return;
    }

    if (!isLoggedIn) {
      setAuthAlert({
        message: "Debes iniciar sesión para agregar productos al carrito.",
      });
      return;
    }

    const variante = {
      id: fav.id,
      color: fav.color ?? null,
      talla: fav.talla ?? null,
      precio_actual: fav.price,
    };

    const producto = {
      id: fav.productoId,
      nombre: fav.name,
      brand: fav.brand,
    };

    addItem(variante as any, producto as any, 1, fav.imagenUrl ?? null);

    setAuthAlert({
      message: "El producto se añadió al carrito.",
    });
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu /> {/* 👈 AÑADIDO */}

      <main className="max-w-4xl mx-auto px-4 py-8 pt-[140px]">
        <div className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:underline">Inicio</Link>
          <span className="mx-1">›</span>
          <span className="text-gray-800 font-medium">Favoritos</span>
        </div>

        <h1 className="text-2xl font-bold mb-4">Mis productos favoritos</h1>

        {!hasFavorites && (
          <div className="rounded-lg border bg-white p-6 text-center">
            <p className="mb-4 text-gray-600">
              Aún no has guardado productos en favoritos.
            </p>
            <button
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
                  {fav.brand && <p className="text-xs text-gray-500">{fav.brand}</p>}

                  {(fav.color || fav.talla) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fav.color && <>Color: {fav.color}</>}
                      {fav.color && fav.talla && " · "}
                      {fav.talla && <>Talla: {fav.talla}</>}
                    </p>
                  )}

                  <p className="mt-1 text-sm text-[#6b21a8] font-semibold">
                    ₡{fav.price.toLocaleString("es-CR")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAddFavoriteToCart(fav)}
                    className="flex items-center justify-center rounded-lg bg-[#a855f7] px-3 py-1.5 text-white hover:bg-[#7e22ce] text-lg"
                  >
                    🛒
                  </button>

                  <button
                    onClick={() => removeFavorite(fav.id)}
                    className="flex items-center justify-center rounded-lg border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50 text-lg"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Toast */} {/* ... lo demás queda igual ... */}
    </div>
  );
}