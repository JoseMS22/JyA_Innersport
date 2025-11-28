// frontend/app/context/cartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ====== CONFIG API ======
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// ====== Tipos mínimos de variante y producto (front) ======
type VarianteBasic = {
  id: number;
  sku?: string;
  color?: string | null;
  talla?: string | null;
  precio_actual?: number | string;
};

type ProductoBasic = {
  id: number;
  nombre?: string;
  name?: string;
  brand?: string;
};

// ====== Tipos que devuelve el backend ======
type CartItemFromApi = {
  variante_id: number;
  producto_id: number;
  nombre_producto: string;
  marca?: string | null;
  sku?: string | null;
  color?: string | null;
  talla?: string | null;
  cantidad: number;
  precio_unitario: number | string;
  subtotal: number | string;
  imagen_url?: string | null;
};

type CartApiResponse = {
  items: CartItemFromApi[];
  total_items: number;
  total: number | string;
};

// ====== Tipo interno del contexto ======
export type CartItem = {
  id: number; // id de la VARIANTE
  productoId: number;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  sku?: string;
  color?: string | null;
  talla?: string | null;
  imagenUrl?: string | null;
};

type CartContextType = {
  items: CartItem[];
  addItem: (
    variante: VarianteBasic,
    producto: ProductoBasic,
    quantity?: number,
    imagenUrl?: string | null
  ) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  totalItems: number;
  total: number;
  setUserId: (userId: number | null) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

// Clave base localStorage
const BASE_STORAGE_KEY = "jya_cart";

function mapApiItemToCartItem(api: CartItemFromApi): CartItem {
  const priceNumber = Number(api.precio_unitario ?? 0);
  return {
    id: api.variante_id,
    productoId: api.producto_id,
    name: api.nombre_producto,
    brand: api.marca ?? undefined,
    price: isNaN(priceNumber) ? 0 : priceNumber,
    quantity: api.cantidad,
    sku: api.sku ?? undefined,
    color: api.color ?? null,
    talla: api.talla ?? null,
    imagenUrl: api.imagen_url ?? null,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserIdState] = useState<number | null>(null);

  const storageKey =
    userId !== null
      ? `${BASE_STORAGE_KEY}_user_${userId}`
      : `${BASE_STORAGE_KEY}_guest`;

  // Cargar carrito desde localStorage (cache) cuando cambia el usuario
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(parsed);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Error cargando carrito desde localStorage:", err);
      setItems([]);
    }
  }, [storageKey]);

  // Guardar carrito en localStorage en cada cambio
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (err) {
      console.error("Error guardando carrito en localStorage:", err);
    }
  }, [items, storageKey]);

  // Cargar carrito REAL desde el backend cuando haya usuario logueado
useEffect(() => {
  async function fetchCartFromServer() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cart`, {
        credentials: "include",
      });

      // Si no hay sesión, no pisamos el carrito local (modo invitado)
      if (res.status === 401 || res.status === 403) {
        return;
      }

      if (!res.ok) {
        console.error("Error cargando carrito desde backend:", res.status);
        return;
      }

      const data: CartApiResponse = await res.json();
      const mapped = data.items.map(mapApiItemToCartItem);
      setItems(mapped);
    } catch (err) {
      console.error("Error fetch /api/v1/cart:", err);
    }
  }

  fetchCartFromServer();
  // lo dejamos depender de userId para que también se refresque
  // cuando cambie (login/logout), pero ya no salimos si es null
}, [userId]);

  // ========= ACCIONES =========

  const addItem: CartContextType["addItem"] = async (
    variante,
    producto,
    quantity = 1,
    imagenUrl = null
  ) => {
    // 🔹 Sin usuario logueado → solo localStorage
    if (userId === null) {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === variante.id);
        if (existing) {
          return prev.map((i) =>
            i.id === variante.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        }

        const name = producto.nombre ?? producto.name ?? "Producto sin nombre";
        const priceNumber = Number(
          (variante.precio_actual as number | string | undefined) ?? 0
        );

        const newItem: CartItem = {
          id: variante.id,
          productoId: producto.id,
          name,
          brand: producto.brand,
          price: isNaN(priceNumber) ? 0 : priceNumber,
          quantity,
          sku: variante.sku,
          color: variante.color ?? null,
          talla: variante.talla ?? null,
          imagenUrl: imagenUrl ?? null,
        };

        return [...prev, newItem];
      });
      return;
    }

    // 🔹 Con usuario → API backend
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cart/items`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variante_id: variante.id,
          cantidad: quantity,
        }),
      });

      if (!res.ok) {
        console.error("Error POST /cart/items:", res.status);
        return;
      }

      const data: CartApiResponse = await res.json();
      const mapped = data.items.map(mapApiItemToCartItem);
      setItems(mapped);
    } catch (err) {
      console.error("Error llamando a /api/v1/cart/items:", err);
    }
  };

  const updateQuantity: CartContextType["updateQuantity"] = async (
    id,
    quantity
  ) => {
    // id = variante_id

    // 🔹 Invitado → solo local
    if (userId === null) {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      );
      return;
    }

    // 🔹 Con usuario → PATCH backend
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cart/items/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cantidad: quantity }),
      });

      if (!res.ok) {
        console.error("Error PATCH /cart/items/{id}:", res.status);
        return;
      }

      const data: CartApiResponse = await res.json();
      const mapped = data.items.map(mapApiItemToCartItem);
      setItems(mapped);
    } catch (err) {
      console.error("Error llamando a PATCH /api/v1/cart/items/{id}:", err);
    }
  };

  const removeItem: CartContextType["removeItem"] = async (id) => {
    // 🔹 Invitado
    if (userId === null) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }

    // 🔹 Con usuario
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cart/items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Error DELETE /cart/items/{id}:", res.status);
        return;
      }

      const data: CartApiResponse = await res.json();
      const mapped = data.items.map(mapApiItemToCartItem);
      setItems(mapped);
    } catch (err) {
      console.error("Error llamando a DELETE /api/v1/cart/items/{id}:", err);
    }
  };

  const clearCart: CartContextType["clearCart"] = async () => {
    // 🔹 Invitado
    if (userId === null) {
      setItems([]);
      return;
    }

    // 🔹 Con usuario
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/cart`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        // si hay 401/404, igual limpiamos local
        console.warn("Error DELETE /cart:", res.status);
        setItems([]);
        return;
      }

      const data: CartApiResponse = await res.json();
      const mapped = data.items.map(mapApiItemToCartItem);
      setItems(mapped);
    } catch (err) {
      console.error("Error llamando a DELETE /api/v1/cart:", err);
      setItems([]);
    }
  };

  const { total, totalItems } = useMemo(() => {
    const t = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const ti = items.reduce((acc, item) => acc + item.quantity, 0);
    return { total: t, totalItems: ti };
  }, [items]);

  const setUserId: CartContextType["setUserId"] = (id) => {
    setUserIdState(id);
  };

  const value: CartContextType = {
    items,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    total,
    setUserId,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return ctx;
}