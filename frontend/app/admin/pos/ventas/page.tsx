// frontend/app/admin/pos/ventas/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type VentaPOSListItem = {
    id: number;
    sucursal_id: number;
    sucursal_nombre: string;
    impuesto?: string;
    total: string;
    estado: string;
    fecha_creacion: string;
    metodo_principal: string;
    nombre_cliente_ticket?: string | null;
};

const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
});

// Estados de las ventas POS
const ESTADOS_POS = [
    { key: "TODOS", label: "Todos" },
    { key: "PAGADO", label: "Pagados" },
    { key: "ENTREGADO", label: "Entregados" },
    { key: "CANCELADO", label: "Cancelados" },
];

export default function AdminPosVentasPage() {
    const router = useRouter();

    const [ventas, setVentas] = useState<VentaPOSListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [estadoFiltro, setEstadoFiltro] = useState<string>("TODOS");

    // 🏬 Filtro por sucursal (TODAS = sin filtro)
    const [sucursalFiltro, setSucursalFiltro] =
        useState<"TODAS" | number>("TODAS");

    // 🔎 Filtro de texto (igual que en /seller/ventas)
    const [filtroTexto, setFiltroTexto] = useState("");

    async function loadVentas() {
        try {
            setLoading(true);
            setError(null);

            // El backend devuelve todas las ventas POS (ADMIN)
            const data = (await apiFetch("/api/v1/pos/ventas/mias", {
                method: "GET",
            })) as VentaPOSListItem[];

            setVentas(data);
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? "Error al cargar ventas POS");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadVentas();
    }, []);

    function handleVerDetalle(id: number) {
        router.push(`/admin/pos/ventas/${id}`);
    }

    // 🏬 sucursales únicas a partir de las ventas
    const sucursalesUnicas = useMemo(
        () =>
            Array.from(
                new Map<
                    number,
                    {
                        id: number;
                        nombre: string;
                    }
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

    // Filtros combinados (estado + sucursal + texto)
    const ventasFiltradas = useMemo(() => {
        return ventas.filter((v) => {
            // filtro estado
            if (estadoFiltro !== "TODOS" && v.estado !== estadoFiltro) {
                return false;
            }

            // filtro sucursal
            if (sucursalFiltro !== "TODAS" && v.sucursal_id !== sucursalFiltro) {
                return false;
            }

            // filtro texto (igual lógica que en SellerVentasPage)
            if (!filtroTexto.trim()) return true;
            const term = filtroTexto.toLowerCase();

            return (
                v.sucursal_nombre.toLowerCase().includes(term) ||
                (v.nombre_cliente_ticket || "").toLowerCase().includes(term) ||
                v.metodo_principal.toLowerCase().includes(term) ||
                String(v.id).includes(term)
            );
        });
    }, [ventas, estadoFiltro, sucursalFiltro, filtroTexto]);

    // Clases para el chip de estado
    function getEstadoChipClasses(estado: string) {
        if (estado === "CANCELADO") {
            return "bg-red-50 text-red-700 border border-red-200";
        }
        if (estado === "ENTREGADO") {
            return "bg-emerald-50 text-emerald-700 border border-emerald-200";
        }
        // PAGADO u otros
        return "bg-green-50 text-green-700 border-green-200";
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#6b21a8]">Ventas POS</h1>
                    <p className="text-xs text-gray-500">
                        Gestiona las ventas realizadas en el POS, revisa su detalle y cambia su estado.
                    </p>
                </div>
            </header>

            {/* Filtros */}
            <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm space-y-3">
                {/* Filtros por estado (chips) */}
                <div className="flex flex-wrap gap-2">
                    {ESTADOS_POS.map((e) => (
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

                {/* Sucursal + búsqueda (igual estructura que en SellerVentasPage) */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
                    {/* 🏬 Filtro por sucursal */}
                    <div className="w-full sm:w-64 text-[11px]">
                        <label className="block font-semibold text-gray-700 mb-1">
                            Filtrar por sucursal
                        </label>
                        <div className="relative inline-block w-full">
                            <span className="pointer-events-none absolute left-2 top-2 text-gray-400 text-xs">
                                🏬
                            </span>
                            <select
                                value={
                                    sucursalFiltro === "TODAS" ? "TODAS" : String(sucursalFiltro)
                                }
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

                    {/* 🔎 Buscar (copiado de SellerVentasPage) */}
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Buscar
                        </label>
                        <input
                            type="text"
                            placeholder="Buscar por sucursal, cliente, método de pago o ID de venta..."
                            className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm bg-white outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                            value={filtroTexto}
                            onChange={(e) => setFiltroTexto(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* Errores */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                    {error}
                </div>
            )}

            {/* Tabla de ventas POS */}
            <section className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm">
                {loading ? (
                    <div className="py-6 text-center text-xs text-gray-500">
                        Cargando ventas POS...
                    </div>
                ) : ventasFiltradas.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-500">
                        No hay ventas que coincidan con los filtros seleccionados.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                        <table className="min-w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr className="text-[11px] text-gray-500">
                                    <th className="px-3 py-2 text-left font-semibold">Venta</th>
                                    <th className="px-3 py-2 text-left font-semibold">Estado</th>
                                    <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">
                                        Método
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold">Total</th>
                                    <th className="px-3 py-2 text-left font-semibold hidden md:table-cell">
                                        Fecha
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventasFiltradas.map((v) => (
                                    <tr
                                        key={v.id}
                                        className="border-t border-gray-100 hover:bg-gray-50/60"
                                    >
                                        <td className="px-3 py-2">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-800">
                                                    Venta #{v.id}
                                                </span>

                                                <span className="text-[10px] text-gray-500">
                                                    {v.sucursal_nombre || `Sucursal #${v.sucursal_id}`}
                                                </span>

                                                {v.nombre_cliente_ticket && (
                                                    <span className="text-[10px] text-gray-500">
                                                        Cliente: {v.nombre_cliente_ticket}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={
                                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                                                    getEstadoChipClasses(v.estado)
                                                }
                                            >
                                                {v.estado}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 hidden sm:table-cell">
                                            {v.metodo_principal}
                                        </td>
                                        <td className="px-3 py-2 text-gray-800">
                                            {currency.format(Number(v.total))}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 hidden md:table-cell">
                                            {new Date(v.fecha_creacion).toLocaleString("es-CR")}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleVerDetalle(v.id)}
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
