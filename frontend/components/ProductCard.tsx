// frontend/components/ProductCard.tsx
"use client";

import { useCart } from "../app/context/cartContext";
import type { Producto, Variante } from "../lib/types";

type ProductCardProps = {
  producto: Producto;
  variante: Variante;
};

export function ProductCard({ producto, variante }: ProductCardProps) {
  const { addItem } = useCart();

  const imagenUrl =
    producto.media && producto.media.length > 0
      ? producto.media[0].url
      : null;

  const handleAdd = () => {
    addItem(variante, producto, 1, imagenUrl);
  };

  return (
    <div className="flex flex-col rounded-lg border bg-white p-4">
      {imagenUrl && (
        <img
          src={imagenUrl}
          alt={producto.nombre}
          className="mb-3 h-40 w-full rounded object-cover"
        />
      )}
      <h3 className="text-sm font-semibold">{producto.nombre}</h3>
      <p className="mb-3 text-sm text-gray-600">
        ₡{Number(variante.precio_actual).toLocaleString("es-CR")}
      </p>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-auto rounded-lg bg-[#a855f7] px-3 py-2 text-xs font-medium text-white hover:bg-[#7e22ce]"
      >
        Agregar al carrito
      </button>
    </div>
  );
}
