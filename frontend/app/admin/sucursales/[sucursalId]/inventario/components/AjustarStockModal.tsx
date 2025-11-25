"use client";

import { useState } from "react";

interface Props {
  varianteId: number;
  sucursalId: number;
  currentCantidad: number;
  currentMinStock: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AjustarStockModal({
  varianteId,
  sucursalId,
  currentCantidad,
  currentMinStock,
  onClose,
  onSaved,
}: Props) {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
  const [cantidad, setCantidad] = useState<number | "">(1);
  const [motivo, setMotivo] = useState("");
  const [minStock, setMinStock] = useState<number | "">(
    currentMinStock ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit() {
    setErrorMsg(null);

    if (cantidad === "" || Number(cantidad) <= 0) {
      setErrorMsg("La cantidad debe ser mayor que cero.");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        variante_id: varianteId,
        sucursal_id: sucursalId,
        tipo,
        cantidad: Number(cantidad),
        motivo,
        referencia: "",
      };

      if (minStock !== "" && minStock !== null) {
        body.min_stock = Number(minStock);
      }

      const res = await fetch(`${API}/api/v1/inventario/ajustar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail || "Error al ajustar inventario."
        );
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error ajustando inventario:", err);
      setErrorMsg(err.message || "No se pudo ajustar el inventario.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
      <div className="bg-white w-full max-w-sm rounded-xl p-6 shadow-xl text-xs space-y-3">
        <h2 className="text-lg font-bold text-[#6b21a8]">
          Ajustar inventario
        </h2>

        {/* Info actual */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-[11px] text-gray-700 flex justify-between">
          <div>
            <span className="font-semibold">Stock actual: </span>
            <span>{currentCantidad}</span>
          </div>
          <div>
            <span className="font-semibold">Mínimo actual: </span>
            <span>{currentMinStock ?? "-"}</span>
          </div>
        </div>

        {/* Tipo */}
        <div className="space-y-1">
          <label className="font-medium">Tipo</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as "ENTRADA" | "SALIDA" | "AJUSTE")
            }
          >
            <option value="ENTRADA">ENTRADA (sumar)</option>
            <option value="SALIDA">SALIDA (restar)</option>
            <option value="AJUSTE">AJUSTE (poner cantidad exacta)</option>
          </select>
          <p className="text-[11px] text-gray-500">
            • ENTRADA: suma al stock actual. • SALIDA: resta del stock. •
            AJUSTE: deja el stock exactamente en la cantidad indicada.
          </p>
        </div>

        {/* Cantidad */}
        <div className="space-y-1">
          <label className="font-medium">Cantidad</label>
          <input
            type="number"
            min={1}
            className="w-full border rounded px-2 py-1"
            value={cantidad}
            onChange={(e) =>
              setCantidad(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
        </div>

        {/* Motivo */}
        <div className="space-y-1">
          <label className="font-medium">Motivo</label>
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="Ej: Ajuste manual"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        {/* Mínimo de stock (opcional) */}
        <div className="space-y-1">
          <label className="font-medium">Stock mínimo (opcional)</label>
          <input
            type="number"
            min={0}
            className="w-full border rounded px-2 py-1"
            value={minStock}
            onChange={(e) =>
              setMinStock(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            placeholder="Ej: 5"
          />
          <p className="text-[11px] text-gray-500">
            Si lo dejas vacío, el mínimo no se modifica.
          </p>
        </div>

        {errorMsg && (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            disabled={loading}
            className="px-3 py-1 rounded bg-[#a855f7] text-white hover:bg-[#7e22ce] disabled:opacity-60"
            onClick={submit}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
