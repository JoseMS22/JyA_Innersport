// frontend/app/context/favoritesContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type FavoriteItem = {
  id: number; // id de la VARIANTE
  productoId: number;
  name: string;
  brand?: string;
  price: number;
  imagenUrl?: string | null;
  color?: string | null; // 👈 nuevo
  talla?: string | null; // 👈 nuevo
};

type FavoritesContextType = {
  favorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: number) => void;
  clearFavorites: () => void;
  isFavorite: (id: number) => boolean;
  setUserId: (userId: number | null) => void;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

const BASE_STORAGE_KEY = "jya_favorites";

// Tipos de backend
type FavoriteFromApi = {
  variante_id: number;
  producto_id: number;
  nombre_producto: string;
  marca?: string | null;
  precio: number | string;
  imagen_url?: string | null;
  color?: string | null; 
  talla?: string | null; 
};

type FavoritesResponse = {
  items: FavoriteFromApi[];
};

function mapFavoriteFromApi(api: FavoriteFromApi): FavoriteItem {
  const priceNumber = Number(api.precio ?? 0);
  return {
    id: api.variante_id,
    productoId: api.producto_id,
    name: api.nombre_producto,
    brand: api.marca ?? undefined,
    price: isNaN(priceNumber) ? 0 : priceNumber,
    imagenUrl: api.imagen_url ?? null,
    color: api.color ?? null, 
    talla: api.talla ?? null, 
  };
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [userId, setUserIdState] = useState<number | null>(null);

  const storageKey =
    userId !== null
      ? `${BASE_STORAGE_KEY}_user_${userId}`
      : `${BASE_STORAGE_KEY}_no_user`;

  // Cargar favoritos desde backend cuando haya usuario
  useEffect(() => {
    if (userId === null) {
      // sin usuario no mostramos favoritos
      setFavorites([]);
      return;
    }

    async function fetchFavorites() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/favoritos`, {
          credentials: "include",
        });
        if (!res.ok) {
          console.error("Error GET /favoritos:", res.status);
          return;
        }

        const data: FavoritesResponse = await res.json();
        const mapped = data.items.map(mapFavoriteFromApi);
        setFavorites(mapped);
      } catch (err) {
        console.error("Error cargando favoritos:", err);
      }
    }

    fetchFavorites();
  }, [userId]);

  // Guardar cache local
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userId === null) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch (err) {
      console.error("Error guardando favoritos:", err);
    }
  }, [favorites, storageKey, userId]);

  const toggleFavorite: FavoritesContextType["toggleFavorite"] = async (
    item
  ) => {
    if (userId === null) {
      console.warn("No se puede gestionar favoritos sin usuario logueado");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/favoritos/toggle`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        // El backend sigue usando solo variante_id para identificar el favorito
        body: JSON.stringify({ variante_id: item.id }),
      });

      if (!res.ok) {
        console.error("Error POST /favoritos/toggle:", res.status);
        return;
      }

      const data: FavoritesResponse = await res.json();
      const mapped = data.items.map(mapFavoriteFromApi);
      setFavorites(mapped);
    } catch (err) {
      console.error("Error llamando a /favoritos/toggle:", err);
    }
  };

  const removeFavorite: FavoritesContextType["removeFavorite"] = async (id) => {
    if (userId === null) return;

    // Más simple: usamos el toggle en vez del DELETE opcional
    await toggleFavorite({
      id,
      productoId: 0,
      name: "",
      price: 0,
      imagenUrl: null,
      color: null,
      talla: null,
    });
  };

  const clearFavorites: FavoritesContextType["clearFavorites"] = () => {
    // Solo limpiamos estado local al cerrar sesión
    setFavorites([]);
  };

  const isFavorite: FavoritesContextType["isFavorite"] = (id) => {
    if (userId === null) return false;
    return favorites.some((f) => f.id === id);
  };

  const setUserId: FavoritesContextType["setUserId"] = (id) => {
    setUserIdState(id);
  };

  const value: FavoritesContextType = useMemo(
    () => ({
      favorites,
      toggleFavorite,
      removeFavorite,
      clearFavorites,
      isFavorite,
      setUserId,
    }),
    [favorites, userId]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  }
  return ctx;
}