"use client";

import { useEffect, useState } from "react";

interface Movimiento {
  id: number;
  variante_id: number;
  sucursal_id: number;
  tipo: string;
  cantidad: number;
  referencia?: string | null;
  observacion?: string | null;
  fecha: string;
}

interface Props {
  varianteId: number;
  sucursalId: number;
  onClose: () => void;
}

export function MovimientosModal({ varianteId, sucursalId, onClose }: Props) {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [items, setItems] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch(
        `${API}/api/v1/inventario/movimientos?sucursal_id=${sucursalId}&variante_id=${varianteId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varianteId, sucursalId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
      <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl text-xs space-y-3">
        <h2 className="text-lg font-bold text-[#6b21a8]">
          Movimientos de inventario
        </h2>

        {/* LISTA */}
        <div className="max-h-[300px] overflow-y-auto border rounded p-3 space-y-3">
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500">
              Aún no hay movimientos registrados para esta variante.
            </p>
          ) : (
            items.map((m) => (
              <div key={m.id} className="border rounded p-2 bg-gray-50">
                <div className="flex justify-between">
                  <span
                    className={`font-bold ${
                      m.tipo === "ENTRADA"
                        ? "text-green-600"
                        : m.tipo === "AJUSTE"
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    {m.tipo}
                  </span>

                  <span className="text-gray-500">
                    {new Date(m.fecha).toLocaleString()}
                  </span>
                </div>

                <p className="text-gray-800 mt-1">
                  Cantidad:{" "}
                  <span className="font-semibold">{m.cantidad}</span>
                </p>

                {m.referencia && (
                  <p className="text-gray-600 text-[11px]">
                    Ref: {m.referencia}
                  </p>
                )}
                {m.observacion && (
                  <p className="text-gray-600 text-[11px]">
                    Obs: {m.observacion}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
