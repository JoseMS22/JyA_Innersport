// frontend/app/seller/ventas/page.tsx
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

export default function SellerVentasPage() {
  const router = useRouter();
  const [ventas, setVentas] = useState<VentaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserMe | null>(null);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

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

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (filtroEstado !== "TODOS" && v.estado !== filtroEstado) {
        return false;
      }
      if (!filtroTexto.trim()) return true;
      const term = filtroTexto.toLowerCase();

      return (
        v.sucursal_nombre.toLowerCase().includes(term) ||
        (v.nombre_cliente_ticket || "").toLowerCase().includes(term) ||
        v.metodo_principal.toLowerCase().includes(term) ||
        String(v.id).includes(term)
      );
    });
  }, [ventas, filtroEstado, filtroTexto]);

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {user && <SellerMenu user={user} onLogout={handleLogout} />}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Encabezado */}
        <section className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[#6b21a8]">Ventas POS</h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            Aquí puedes revisar las ventas realizadas desde el POS del vendedor.
          </p>
        </section>

        {/* Filtros */}
        <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
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

          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
            >
              <option value="TODOS">Todos</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] uppercase text-gray-500">
                    <th className="text-left py-2 pr-3">ID</th>
                    <th className="text-left py-2 pr-3">Fecha</th>
                    <th className="text-left py-2 pr-3">Sucursal</th>
                    <th className="text-left py-2 pr-3">Cliente</th>
                    <th className="text-left py-2 pr-3">Método</th>
                    <th className="text-right py-2 pl-3">Total</th>
                    <th className="text-center py-2 pl-3">Estado</th>
                    <th className="text-center py-2 pl-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-gray-100 hover:bg-[#f9fafb]"
                    >
                      <td className="py-2 pr-3 text-gray-700">#{v.id}</td>
                      <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                        {new Date(v.fecha_creacion).toLocaleString("es-CR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {v.sucursal_nombre}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">
                        {v.nombre_cliente_ticket || "Anónimo"}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">
                        {v.metodo_principal}
                      </td>
                      <td className="py-2 pl-3 text-right font-semibold text-[#6b21a8]">
                        {currency.format(Number(v.total))}
                      </td>
                      <td className="py-2 pl-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            v.estado === "COMPLETADA"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          }`}
                        >
                          {v.estado}
                        </span>
                      </td>
                      <td className="py-2 pl-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/seller/ventas/${v.id}`)
                          }
                          className="text-[11px] text-[#6b21a8] hover:text-[#a855f7] font-semibold"
                        >
                          Ver detalle
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
