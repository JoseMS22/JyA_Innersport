// frontend/components/Providers.tsx
"use client";

import React from "react";
import { CartProvider } from "../app/context/cartContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}