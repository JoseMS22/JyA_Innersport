"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type InventarioItem = {
  id: number;
  cantidad: number; // 👈 viene como "cantidad" del backend
  min_stock: number | null;

  variante: {
    id: number;
    sku?: string | null;
    talla?: string | null;
    color?: string | null;
    precio_actual?: number | null;
    producto_id?: number;
    producto?: {
      id: number;
      nombre: string;
    } | null;
  };

  sucursal: {
    id: number;
    nombre: string;
  };
};

import { AjustarStockModal } from "./components/AjustarStockModal";
import { MovimientosModal } from "./components/MovimientosModal";

export default function InventarioSucursalPage() {
  const { sucursalId } = useParams();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVariante, setSelectedVariante] = useState<number | null>(null);
  const [currentCantidad, setCurrentCantidad] = useState<number>(0);
  const [currentMinStock, setCurrentMinStock] = useState<number | null>(null);

  const [showAjuste, setShowAjuste] = useState(false);
  const [showMovimientos, setShowMovimientos] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  // ======================
  // Cargar inventario
  // ======================
  async function loadInventario() {
    try {
      setLoading(true);
      const res = await fetch(
        `${API}/api/v1/inventario?sucursal_id=${sucursalId}`,
        { credentials: "include" }
      );

      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Error cargando inventario:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalId]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Inventario de sucursal #{sucursalId}
          </h1>
          <p className="text-xs text-gray-500">
            Gestiona el stock, movimientos y variantes disponibles.
          </p>
        </div>
      </header>

      {/* TABLA */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        {loading ? (
          <p className="text-xs text-gray-500">Cargando inventario...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-gray-500">
            Esta sucursal aún no tiene inventario.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-100 text-gray-600">
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-left">Color</th>
                  <th className="px-3 py-2 text-left">Talla</th>
                  <th className="px-3 py-2 text-center">Stock</th>
                  <th className="px-3 py-2 text-center">Mínimo</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b hover:bg-gray-50">
                    {/* Producto */}
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-800">
                        {i.variante?.producto?.nombre ??
                          `Variante #${i.variante.id}`}
                      </span>
                    </td>

                    {/* Color */}
                    <td className="px-3 py-3 text-gray-700">
                      {i.variante.color || "-"}
                    </td>

                    {/* Talla */}
                    <td className="px-3 py-3 text-gray-700">
                      {i.variante.talla || "-"}
                    </td>

                    {/* Stock */}
                    <td className="px-3 py-3 text-center font-bold text-[#6b21a8]">
                      {i.cantidad}
                    </td>

                    {/* Mínimo */}
                    <td
                      className={`px-3 py-3 text-center font-semibold ${
                        i.min_stock != null && i.cantidad < i.min_stock
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      {i.min_stock ?? "-"}
                    </td>

                    {/* ACCIONES */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedVariante(i.variante.id);
                            setCurrentCantidad(i.cantidad);
                            setCurrentMinStock(i.min_stock);
                            setShowAjuste(true);
                          }}
                          className="px-2 py-1 text-xs rounded bg-[#a855f7] text-white hover:bg-[#7e22ce]"
                        >
                          Ajustar
                        </button>

                        <button
                          onClick={() => {
                            setSelectedVariante(i.variante.id);
                            setShowMovimientos(true);
                          }}
                          className="px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-black"
                        >
                          Movimientos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALES */}
      {showAjuste && selectedVariante !== null && (
        <AjustarStockModal
          varianteId={selectedVariante}
          sucursalId={Number(sucursalId)}
          currentCantidad={currentCantidad}
          currentMinStock={currentMinStock}
          onClose={() => setShowAjuste(false)}
          onSaved={() => loadInventario()}
        />
      )}

      {showMovimientos && selectedVariante !== null && (
        <MovimientosModal
          varianteId={selectedVariante}
          sucursalId={Number(sucursalId)}
          onClose={() => setShowMovimientos(false)}
        />
      )}
    </div>
  );
}
