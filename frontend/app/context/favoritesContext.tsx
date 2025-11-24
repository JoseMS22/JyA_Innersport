// frontend/app/context/favoritesContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type FavoriteItem = {
  id: number;              // id de la variante/producto
  productoId: number;
  name: string;
  brand?: string;
  price: number;
  imagenUrl?: string | null;
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

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [userId, setUserIdState] = useState<number | null>(null);

  // 👉 Clave solo por usuario. Si no hay usuario, usamos una clave dummy
  const storageKey =
    userId !== null
      ? `${BASE_STORAGE_KEY}_user_${userId}`
      : `${BASE_STORAGE_KEY}_no_user`;

  // Cargar favoritos cuando cambia userId
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si NO hay usuario, no cargamos nada y dejamos vacío
    if (userId === null) {
      setFavorites([]);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as FavoriteItem[];
        setFavorites(parsed);
      } else {
        setFavorites([]);
      }
    } catch (err) {
      console.error("Error cargando favoritos:", err);
      setFavorites([]);
    }
  }, [storageKey, userId]);

  // Guardar favoritos cuando cambian, solo si hay usuario
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userId === null) return; // 👈 sin usuario, no persistimos nada

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch (err) {
      console.error("Error guardando favoritos:", err);
    }
  }, [favorites, storageKey, userId]);

  const toggleFavorite: FavoritesContextType["toggleFavorite"] = (item) => {
    // 🚫 si no hay usuario, no hacemos nada
    if (userId === null) {
      console.warn("No se puede gestionar favoritos sin usuario logueado");
      return;
    }

    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id);
      if (exists) {
        return prev.filter((f) => f.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const removeFavorite: FavoritesContextType["removeFavorite"] = (id) => {
    if (userId === null) return;
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const clearFavorites: FavoritesContextType["clearFavorites"] = () => {
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