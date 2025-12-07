// frontend/components/Providers.tsx
"use client";

import React from "react";
import { CartProvider } from "../app/context/cartContext";
import { FavoritesProvider } from "../app/context/favoritesContext"; // Si usas favoritos, inclúyelo
import { ToastProvider } from "../app/context/ToastContext"; // 👈 IMPORTANTE: Verifica que la ruta sea correcta

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider> {/* 👈 EL PROVEEDOR DEBE ENVOLVER TODO */}
      <CartProvider>
        <FavoritesProvider>
            {children}
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}