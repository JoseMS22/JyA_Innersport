// frontend/app/favorites/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFavorites } from "../context/favoritesContext";
import { useCart } from "../context/cartContext";
import { useNotifications } from "../context/NotificationContext";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function FavoritesPage() {
  const { favorites, removeFavorite, setUserId } = useFavorites();
  const { addItem } = useCart();
  const { success, error, info, confirm } = useNotifications();
  const router = useRouter();

  const hasFavorites = favorites.length > 0;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

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

  const handleAddFavoriteToCart = (fav: (typeof favorites)[number]) => {
    if (checkingAuth) {
      info(
        "Verificando sesión",
        "Estamos verificando tu sesión, inténtalo de nuevo en un momento."
      );
      return;
    }

    if (!isLoggedIn) {
      error(
        "Sesión requerida",
        "Debes iniciar sesión para agregar productos al carrito."
      );
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

    success("¡Producto añadido!", "El producto se añadió al carrito.");
  };

  const handleRemoveFavorite = (fav: (typeof favorites)[number]) => {
    confirm(
      "Eliminar de favoritos",
      `¿Estás seguro de que deseas eliminar "${fav.name}" de tus favoritos?`,
      () => {
        removeFavorite(fav.id);
        success("Eliminado", "El producto se eliminó de tus favoritos.");
      },
      "Eliminar"
    );
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      <MainMenu />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-[140px] flex-1">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center gap-2 py-3 mb-6 text-sm flex-wrap">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Inicio
          </button>
          <span className="text-gray-400">›</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Favoritos
          </span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Mis productos favoritos</h1>

        {!hasFavorites && (
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#f3e8ff] flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#a855f7]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Sin favoritos aún
            </h2>
            <p className="mb-6 text-gray-600">
              Aún no has guardado productos en favoritos. Explora nuestra
              tienda y guarda tus productos preferidos.
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

        {hasFavorites && (
          <div className="space-y-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Imagen del producto */}
                {fav.imagenUrl && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={fav.imagenUrl}
                      alt={fav.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Información del producto */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base text-gray-900 truncate">
                    {fav.name}
                  </p>
                  {fav.brand && (
                    <p className="text-sm text-gray-500">{fav.brand}</p>
                  )}

                  {(fav.color || fav.talla) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {fav.color && (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">Color:</span> {fav.color}
                        </span>
                      )}
                      {fav.color && fav.talla && (
                        <span className="mx-2">•</span>
                      )}
                      {fav.talla && (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-medium">Talla:</span> {fav.talla}
                        </span>
                      )}
                    </p>
                  )}

                  <p className="mt-2 text-lg text-[#6b21a8] font-bold">
                    ₡{fav.price.toLocaleString("es-CR")}
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAddFavoriteToCart(fav)}
                    className="flex items-center justify-center rounded-lg bg-[#a855f7] p-2.5 text-white hover:bg-[#7e22ce] transition-colors shadow-sm hover:shadow-md"
                    title="Agregar al carrito"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleRemoveFavorite(fav)}
                    className="flex items-center justify-center rounded-lg border border-red-300 p-2.5 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                    title="Eliminar de favoritos"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Contador de favoritos */}
            <div className="mt-6 text-center text-sm text-gray-600">
              {favorites.length === 1
                ? "1 producto guardado"
                : `${favorites.length} productos guardados`}
            </div>
          </div>
        )}
      </main>

      <RecommendedFooter />
    </div>
  );
}