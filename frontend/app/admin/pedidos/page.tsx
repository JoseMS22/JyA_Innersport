// frontend/app/admin/pedidos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type PedidoHistorial = {
  id: number;
  total: number;
  estado: string;
  fecha_creacion: string;
  sucursal_id: number | null;
  sucursal_nombre?: string | null; // 👈 nuevo
  cancelado: boolean;
  numero_pedido?: string | null;
};

const ESTADOS = [
  { key: "TODOS", label: "Todos" },
  { key: "PAGADO", label: "Pagados" },
  { key: "EN_PREPARACION", label: "En preparación" },
  { key: "ENVIADO", label: "Enviados" },
  { key: "ENTREGADO", label: "Entregados" },
  { key: "CANCELADO", label: "Cancelados" },
];

export default function AdminPedidosPage() {
  const router = useRouter();

  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("TODOS");

  // 🏬 Filtro por sucursal (TODAS = sin filtro)
  const [sucursalFiltro, setSucursalFiltro] = useState<"TODAS" | number>(
    "TODAS"
  );

  async function loadPedidos(selectedEstado: string) {
    try {
      setLoading(true);
      setError(null);

      const params =
        selectedEstado === "TODOS"
          ? ""
          : `?estado=${encodeURIComponent(selectedEstado)}`;

      const data = (await apiFetch(`/api/v1/pedidos/admin${params}`, {
        method: "GET",
      })) as PedidoHistorial[];

      setPedidos(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPedidos(estadoFiltro);
    // cada vez que cambia el estado, reseteamos sucursal a TODAS
    setSucursalFiltro("TODAS");
  }, [estadoFiltro]);

  function handleVerDetalle(id: number) {
    router.push(`/admin/pedidos/${id}`);
  }

  // 🏬 Obtener sucursales únicas (id + nombre) a partir de los pedidos cargados
  const sucursalesUnicas = Array.from(
    new Map<
      number,
      { id: number; nombre: string }
    >(
      pedidos
        .filter((p) => p.sucursal_id !== null)
        .map((p) => {
          const id = p.sucursal_id as number;
          const nombre =
            p.sucursal_nombre || `Sucursal #${id}`;
          return [id, { id, nombre }];
        })
    ).values()
  ).sort((a, b) => a.id - b.id);

  // Aplicar filtro de sucursal sobre los pedidos
  const pedidosFiltrados =
    sucursalFiltro === "TODAS"
      ? pedidos
      : pedidos.filter((p) => p.sucursal_id === sucursalFiltro);

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">Pedidos</h1>
          <p className="text-xs text-gray-500">
            Gestiona los pedidos por estado, revisa su detalle y cambia su estado.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Filtros por estado */}
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <button
              key={e.key}
              onClick={() => setEstadoFiltro(e.key)}
              className={
                "text-[11px] px-3 py-1.5 rounded-full border transition-colors " +
                (estadoFiltro === e.key
                  ? "bg-[#f5f3ff] text-[#6b21a8] border border-[#a855f7]/40 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
              }
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* 🏬 Filtro por sucursal (bonito y moderno) */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-gray-500 hidden sm:inline">
            Filtrar por sucursal:
          </span>
          <div className="relative inline-block">
            <span className="pointer-events-none absolute left-2 top-1.5 text-gray-400 text-xs">
              🏬
            </span>
            <select
              value={sucursalFiltro === "TODAS" ? "TODAS" : String(sucursalFiltro)}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "TODAS") {
                  setSucursalFiltro("TODAS");
                } else {
                  setSucursalFiltro(Number(value));
                }
              }}
              className="appearance-none pl-7 pr-7 py-1.5 text-[11px] rounded-full border border-gray-200 bg-white text-gray-700 hover:border-[#6b21a8] focus:outline-none focus:ring-2 focus:ring-[#6b21a8]/30 focus:border-[#6b21a8] shadow-sm"
            >
              <option value="TODAS">Todas las sucursales</option>
              {sucursalesUnicas.map((suc) => (
                <option key={suc.id} value={suc.id}>
                  {suc.nombre}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1.5 text-gray-400 text-[9px]">
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Errores */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* Tabla de pedidos */}
      <section className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm">
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-500">
            Cargando pedidos...
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No hay pedidos que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-[11px] text-gray-500">
                  <th className="px-3 py-2 text-left font-semibold">Pedido</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold">Total</th>
                  <th className="px-3 py-2 text-left font-semibold hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                          {p.numero_pedido || `#${p.id}`}
                        </span>

                        {p.sucursal_id !== null && (
                          <span className="text-[10px] text-gray-500">
                            {p.sucursal_nombre ||
                              `Sucursal #${p.sucursal_id}`}
                          </span>
                        )}

                        {p.cancelado && (
                          <span className="text-[10px] text-red-500">
                            Cancelado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{p.estado}</td>
                    <td className="px-3 py-2 text-gray-800">
                      ₡{Number(p.total).toLocaleString("es-CR")}
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden md:table-cell">
                      {new Date(p.fecha_creacion).toLocaleString("es-CR")}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleVerDetalle(p.id)}
                          title="Ver detalles"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full 
             bg-sky-50 text-sky-700 border border-sky-100 
             hover:bg-sky-100 hover:border-sky-200 
             transition-colors text-xs"
                        >
                          {/* Ícono de lupa / detalle */}
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="11" cy="11" r="6" />
                            <line x1="16" y1="16" x2="20" y2="20" />
                          </svg>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
