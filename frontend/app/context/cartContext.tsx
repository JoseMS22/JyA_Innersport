// frontend/app/context/cartContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Datos mínimos que necesitamos de la variante
type VarianteBasic = {
  id: number;
  sku?: string;
  color?: string | null;
  talla?: string | null;
  precio_actual?: number | string;
};

// Datos mínimos que necesitamos del producto
type ProductoBasic = {
  id: number;
  nombre?: string; // viene del backend
  name?: string;   // por si en algún lado usas name en vez de nombre
  brand?: string;
};

export type CartItem = {
  id: number;              // id de la VARIANTE
  productoId: number;
  name: string;            // nombre visible (producto)
  brand?: string;
  price: number;           // precio numérico
  quantity: number;
  sku?: string;
  color?: string | null;
  talla?: string | null;
  imagenUrl?: string | null;
};

type CartContextType = {
  items: CartItem[];

  // addItem: variante + producto (+ opcionales)
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

  // 👇 nuevo: usuario actual del carrito
  setUserId: (userId: number | null) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

// Clave base; la real será jya_cart_user_<id> o jya_cart_guest
const BASE_STORAGE_KEY = "jya_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserIdState] = useState<number | null>(null);

  const storageKey =
    userId !== null ? `${BASE_STORAGE_KEY}_user_${userId}` : `${BASE_STORAGE_KEY}_guest`;

  // Cargar carrito desde localStorage cada vez que cambie el usuario
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(parsed);
      } else {
        setItems([]); // usuario nuevo / sin carrito
      }
    } catch (err) {
      console.error("Error cargando carrito:", err);
      setItems([]);
    }
  }, [storageKey]);

  // Guardar carrito cada vez que cambia
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (err) {
      console.error("Error guardando carrito:", err);
    }
  }, [items, storageKey]);

  const addItem: CartContextType["addItem"] = (
    variante,
    producto,
    quantity = 1,
    imagenUrl = null
  ) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === variante.id);
      if (existing) {
        // Si ya existe esa variante en el carrito, solo aumento cantidad
        return prev.map((i) =>
          i.id === variante.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }

      const name =
        producto.nombre ??
        producto.name ??
        "Producto sin nombre";

      const priceNumber = Number(
        (variante.precio_actual as number | string | undefined) ?? 0
      );

      const newItem: CartItem = {
        id: variante.id,             // id de la variante
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
  };

  const updateQuantity: CartContextType["updateQuantity"] = (id, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const removeItem: CartContextType["removeItem"] = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart: CartContextType["clearCart"] = () => {
    setItems([]);
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