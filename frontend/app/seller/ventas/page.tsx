// frontend/app/seller/ventas/[id]/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SellerMenu } from "@/components/SellerMenu";

type VentaListItem = {
  id: number;
  sucursal_id: number;
  sucursal_nombre: string;
  total: string;
  estado: string;
  fecha_creacion: string;
  metodo_principal: string;
  nombre_cliente_ticket?: string | null;
  impuesto?: string;
};

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

// Estados posibles de la venta POS
const ESTADOS_POS = [
  { key: "TODOS", label: "Todos" },
  { key: "PAGADO", label: "Pagados" },
  { key: "ENTREGADO", label: "Entregados" },
  { key: "CANCELADO", label: "Cancelados" },
];

function getEstadoChipClasses(estado: string): string {
  switch (estado) {
    case "PAGADO":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "ENTREGADO":
      return "bg-green-50 text-green-700 border border-green-200";
    case "CANCELADO":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

export default function SellerVentasPage() {
  const router = useRouter();
  const [ventas, setVentas] = useState<VentaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserMe | null>(null);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

  // 🏬 filtro por sucursal (TODAS = sin filtro)
  const [sucursalFiltro, setSucursalFiltro] = useState<"TODAS" | number>("TODAS");

  useEffect(() => {
    let isMounted = true;

    async function loadAll() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // /me para menú y auth
        const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
        if (!isMounted) return;
        if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setUser(me);

        // Ventas
        const data = (await apiFetch(
          "/api/v1/pos/ventas/mias"
        )) as VentaListItem[];
        if (!isMounted) return;
        setVentas(data);
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMsg(
          err?.message ?? "No se pudieron cargar las ventas del vendedor."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  }

  // 🏬 sucursales únicas a partir de las ventas
  const sucursalesUnicas = useMemo(
    () =>
      Array.from(
        new Map<
          number,
          { id: number; nombre: string }
        >(
          ventas.map((v) => [
            v.sucursal_id,
            {
              id: v.sucursal_id,
              nombre: v.sucursal_nombre || `Sucursal #${v.sucursal_id}`,
            },
          ])
        ).values()
      ).sort((a, b) => a.id - b.id),
    [ventas]
  );

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      // filtro por estado
      if (filtroEstado !== "TODOS" && v.estado !== filtroEstado) {
        return false;
      }

      // filtro por sucursal
      if (sucursalFiltro !== "TODAS" && v.sucursal_id !== sucursalFiltro) {
        return false;
      }

      // filtro por texto
      if (!filtroTexto.trim()) return true;
      const term = filtroTexto.toLowerCase();

      return (
        v.sucursal_nombre.toLowerCase().includes(term) ||
        (v.nombre_cliente_ticket || "").toLowerCase().includes(term) ||
        v.metodo_principal.toLowerCase().includes(term) ||
        String(v.id).includes(term)
      );
    });
  }, [ventas, filtroEstado, filtroTexto, sucursalFiltro]);

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {user && <SellerMenu user={user} onLogout={handleLogout} />}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Encabezado */}
        <section className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[#6b21a8]">Ventas POS</h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            Aquí puedes revisar las ventas realizadas desde el POS del vendedor y su estado.
          </p>
        </section>

        {/* Filtros (estado + sucursal + texto) */}
        <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm space-y-3">
          {/* Estados tipo chips */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {ESTADOS_POS.map((e) => (
              <button
                key={e.key}
                onClick={() => setFiltroEstado(e.key)}
                className={
                  "px-3 py-1.5 rounded-full border transition-colors " +
                  (filtroEstado === e.key
                    ? "bg-[#f5f3ff] text-[#6b21a8] border border-[#a855f7]/40 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
                }
              >
                {e.label}
              </button>
            ))}
          </div>

          {/* Sucursal + búsqueda */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
            {/* 🏬 Filtro sucursal */}
            <div className="w-full sm:w-64 text-[11px]">
              <label className="block font-semibold text-gray-700 mb-1">
                Filtrar por sucursal
              </label>
              <div className="relative inline-block w-full">
                <span className="pointer-events-none absolute left-2 top-2 text-gray-400 text-xs">
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
                  className="appearance-none pl-7 pr-7 py-2 text-xs rounded-full border border-gray-200 bg-white text-gray-700 hover:border-[#6b21a8] focus:outline-none focus:ring-2 focus:ring-[#6b21a8]/30 focus:border-[#6b21a8] shadow-sm w-full"
                >
                  <option value="TODAS">Todas las sucursales</option>
                  {sucursalesUnicas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-2 text-gray-400 text-[9px]">
                  ▼
                </span>
              </div>
            </div>

            {/* Buscar */}
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar por sucursal, cliente, método de pago o ID de venta..."
                className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Contenido */}
        <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm">
          {loading ? (
            <p className="text-sm text-gray-600">Cargando ventas...</p>
          ) : errorMsg ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay ventas que cumplan con los filtros actuales.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-[11px] uppercase text-gray-500">
                    <th className="text-left py-2 pr-3 pl-3">Venta</th>
                    <th className="text-left py-2 pr-3">Sucursal</th>
                    <th className="text-left py-2 pr-3 hidden md:table-cell">
                      Cliente
                    </th>
                    <th className="text-left py-2 pr-3 hidden sm:table-cell">
                      Método
                    </th>
                    <th className="text-left py-2 pr-3 hidden md:table-cell">
                      Fecha
                    </th>
                    <th className="text-right py-2 pl-3 pr-3">Total</th>
                    <th className="text-center py-2 pl-3 pr-3">Estado</th>
                    <th className="text-center py-2 pl-3 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-gray-100 hover:bg-[#f9fafb]"
                    >
                      <td className="py-2 pr-3 pl-3 text-gray-700">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">
                            #{v.id}
                          </span>
                          
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {v.sucursal_nombre}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 hidden md:table-cell">
                        {v.nombre_cliente_ticket || "Anónimo"}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 hidden sm:table-cell">
                        {v.metodo_principal}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 hidden sm:table-cell">
                            {new Date(v.fecha_creacion).toLocaleString("es-CR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                      </td>
                      <td className="py-2 pl-3 pr-3 text-right font-semibold text-[#6b21a8]">
                        {currency.format(Number(v.total))}
                      </td>
                      <td className="py-2 pl-3 pr-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getEstadoChipClasses(
                            v.estado
                          )}`}
                        >
                          {v.estado}
                        </span>
                      </td>
                      <td className="py-2 pl-3 pr-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/seller/ventas/${v.id}`)
                          }
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full 
                            bg-sky-50 text-sky-700 border border-sky-100 
                            hover:bg-sky-100 hover:border-sky-200 
                            transition-colors text-xs"
                        >
                          {/* icono lupa */}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
