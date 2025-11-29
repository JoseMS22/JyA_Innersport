"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Categoria = {
  id: number;
  nombre: string;
};

type Producto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  categorias: Categoria[];
};

type HistorialPrecio = {
  id: number;
  precio: number;
  vigente_desde: string;
  // opcional si tu schema lo tiene
  vigente_hasta?: string | null;
};

type Variante = {
  id: number;
  sku: string | null;
  color: string | null;
  talla: string | null;
  precio_actual: number;
  activo: boolean;
  historial_precios: HistorialPrecio[];
};

type ProductoHistSummary = {
  producto: Producto;
  variantesCount: number;
  historialTotalRegistros: number;
  totalCambios: number; // registros - número de variantes (asumiendo 1 inicial)
};

export default function HistorialPreciosResumenPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [summaries, setSummaries] = useState<ProductoHistSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1) Cargar productos
        const resProd = await fetch(`${API_BASE}/api/v1/productos`, {
          credentials: "include",
        });
        if (!resProd.ok) {
          throw new Error("No se pudieron cargar los productos");
        }
        const prodData: Producto[] = await resProd.json();
        setProductos(prodData);

        // 2) Para cada producto, cargar variantes con historial
        const summariesTemp: ProductoHistSummary[] = [];

        for (const p of prodData) {
          const resVar = await fetch(
            `${API_BASE}/api/v1/variantes/productos/${p.id}/variantes`,
            { credentials: "include" }
          );

          if (!resVar.ok) {
            // si falla uno, seguimos con los demás, pero lo anotamos en log
            console.error(
              `Error cargando variantes para producto ${p.id}`,
              await resVar.text()
            );
            continue;
          }

          const variantes: Variante[] = await resVar.json();
          let totalRegistros = 0;
          let totalCambios = 0;

          for (const v of variantes) {
            const len = v.historial_precios?.length || 0;
            totalRegistros += len;
            if (len > 0) {
              // asumimos que el primer registro es el precio inicial,
              // por lo que cambios = len - 1
              totalCambios += Math.max(len - 1, 0);
            }
          }

          summariesTemp.push({
            producto: p,
            variantesCount: variantes.length,
            historialTotalRegistros: totalRegistros,
            totalCambios,
          });
        }

        setSummaries(summariesTemp);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(
          err?.message || "Ocurrió un error al cargar el historial."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return summaries;

    return summaries.filter((s) => {
      const p = s.producto;
      const inNombre = p.nombre.toLowerCase().includes(term);
      const inDesc = (p.descripcion || "")
        .toLowerCase()
        .includes(term);
      const inCat = (p.categorias || []).some((c) =>
        c.nombre.toLowerCase().includes(term)
      );
      const inEstadoActivo =
        term === "activo" && p.activo === true;
      const inEstadoInactivo =
        term === "inactivo" && p.activo === false;

      return (
        inNombre ||
        inDesc ||
        inCat ||
        inEstadoActivo ||
        inEstadoInactivo
      );
    });
  }, [summaries, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Historial de precios
          </h1>
          <p className="text-xs text-gray-500">
            Consulta cuántas veces han cambiado de precio las variantes
            de cada producto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="text-xs rounded-full py-1.5 pl-8 pr-3 min-w-[220px]
                        bg-[#f3e8ff] text-[#9333ea] placeholder:text-[#9333ea]/60
                        border border-[#d8b4fe]
                        focus:outline-none focus:ring-1 focus:ring-[#7e22ce]"
            />
            <span className="absolute left-2 top-1.5 text-white text-sm">
              🔍
            </span>

          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-xs">
        {loading ? (
          <p className="text-gray-500 text-xs">
            Cargando historial de precios...
          </p>
        ) : errorMsg ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
            {errorMsg}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-xs">
            No hay datos de historial para mostrar.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[11px] text-gray-600">
              <span>
                {filtered.length} producto
                {filtered.length !== 1 ? "s" : ""} en el listado.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-100 text-gray-600">
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">Categorías</th>
                    <th className="px-3 py-2 text-center">
                      Variantes
                    </th>
                    <th className="px-3 py-2 text-center">
                      Registros historial
                    </th>
                    <th className="px-3 py-2 text-center">
                      Cambios de precio
                    </th>
                    <th className="px-3 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const p = s.producto;
                    return (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-gray-50"
                      >
                        {/* Producto */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {p.nombre}
                            </span>
                            {p.descripcion && (
                              <span className="text-[11px] text-gray-500 line-clamp-1">
                                {p.descripcion}
                              </span>
                            )}
                            <span className="mt-1 text-[10px] text-gray-500">
                              Estado:{" "}
                              {p.activo ? (
                                <span className="text-green-600 font-semibold">
                                  Activo
                                </span>
                              ) : (
                                <span className="text-gray-500 font-semibold">
                                  Inactivo
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Categorías */}
                        <td className="px-3 py-3 align-top">
                          {p.categorias && p.categorias.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.categorias.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px]"
                                >
                                  {c.nombre}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Sin categorías
                            </span>
                          )}
                        </td>

                        {/* Variantes */}
                        <td className="px-3 py-3 text-center align-top">
                          <span className="text-[11px] text-gray-800">
                            {s.variantesCount} variante
                            {s.variantesCount !== 1 ? "s" : ""}
                          </span>
                        </td>

                        {/* Registros historial */}
                        <td className="px-3 py-3 text-center align-top">
                          <span className="text-[11px] text-gray-800">
                            {s.historialTotalRegistros}
                          </span>
                        </td>

                        {/* Cambios de precio */}
                        <td className="px-3 py-3 text-center align-top">
                          <span className="text-[11px] font-semibold text-[#6b21a8]">
                            {s.totalCambios}
                          </span>
                          <div className="text-[10px] text-gray-500">
                            (excluye el precio inicial)
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-3 py-3 text-center align-top">
                          <Link
                            href={`/admin/historial-precios/${p.id}`}
                            className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-gray-800 text-white text-[11px] hover:bg-black"
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
