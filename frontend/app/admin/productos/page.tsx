"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Categoria = {
  id: number;
  nombre: string;
};

type Media = {
  id: number;
  url: string;
  tipo: string;
  orden: number;
};

type Producto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  categorias: Categoria[];
  media: Media[];
};

type InventarioItem = {
  id: number;
  sucursal_id: number;
  variante_id: number;
  cantidad: number;        // 👈 viene del backend
  min_stock: number;
  max_stock: number | null;
  variante: {
    id: number;
    producto_id: number;
  };
};


type InventorySummary = {
  totalUnits: number;
  variants: number;
  lowStock: boolean;
};

const PAGE_SIZE = 10;

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function loadProductos() {
    const res = await fetch(`${API_BASE}/api/v1/productos/`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Error al cargar productos");
    }
    const data = await res.json();
    setProductos(data);
  }

  async function loadInventario() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/inventario/`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error(
          "Error HTTP al cargar inventario:",
          res.status,
          res.statusText
        );
        // Si quieres, puedes hacer return aquí y dejar inventario vacío
        return;
      }

      const data = await res.json();
      setInventario(data);
    } catch (err) {
      console.error("Error de red al cargar inventario:", err);
      // Aquí también podrías dejar un estado de error si quieres mostrar algo en UI
    }
  }


  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        await Promise.all([loadProductos(), loadInventario()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  async function desactivarProducto(id: number) {
    if (!confirm("¿Seguro que quieres desactivar este producto?")) return;

    try {
      await fetch(`${API_BASE}/api/v1/productos/${id}/desactivar`, {
        method: "PATCH",
        credentials: "include",
      });
      await loadProductos();
    } catch (err) {
      console.error("Error desactivando producto:", err);
    }
  }

  // =========================
  //  Resumen de inventario por producto
  // =========================
  const inventorySummaryByProduct: Record<number, InventorySummary> =
    useMemo(() => {
      const summary: Record<number, InventorySummary> = {};

      for (const item of inventario) {
        const productId = item.variante?.producto_id;
        if (!productId) continue;

        if (!summary[productId]) {
          summary[productId] = {
            totalUnits: 0,
            variants: 0,
            lowStock: false,
          };
        }

        summary[productId].totalUnits += item.cantidad || 0;
        summary[productId].variants += 1;

        // ⚠️ lógica de mínimo:
        // si hay un min_stock > 0 y la cantidad es <= min_stock,
        // marcamos este producto como "stock bajo"
        if (item.min_stock != null && item.min_stock > 0) {
          if (item.cantidad <= item.min_stock) {
            summary[productId].lowStock = true;
          }
        }

        // Si quieres que 0 unidades SIEMPRE cuente como crítico, podrías hacer:
        // if (item.cantidad === 0) summary[productId].lowStock = true;
      }

      return summary;
    }, [inventario]);

  // =========================
  //  Búsqueda + paginación
  // =========================
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return productos;

    return productos.filter((p) => {
      const inNombre = p.nombre.toLowerCase().includes(term);
      const inDesc = (p.descripcion || "")
        .toLowerCase()
        .includes(term);
      const inCategorias = (p.categorias || []).some((c) =>
        c.nombre.toLowerCase().includes(term)
      );
      const inEstado = term === "activo" && p.activo;
      const inEstado2 = term === "inactivo" && !p.activo;

      return (
        inNombre || inDesc || inCategorias || inEstado || inEstado2
      );
    });
  }, [productos, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Productos
          </h1>
          <p className="text-xs text-gray-500">
            Gestión de catálogo, variantes e inventario global.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
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

          <Link
            href="/admin/productos/nuevo"
            className="text-xs px-4 py-1.5 rounded-full
             bg-[#f5f3ff] text-[#6b21a8] border border-[#e9d5ff]
             font-semibold hover:bg-[#ede9fe] hover:border-[#c4b5fd]
             text-center transition-colors"
          >
            + Nuevo producto
          </Link>

        </div>
      </header>

      {/* Contenido */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-xs">
        {loading ? (
          <p className="text-gray-500 text-xs">
            Cargando productos...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-xs">
            No hay productos para mostrar.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b bg-gray-100 text-gray-600">
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-left">Categorías</th>
                    <th className="px-3 py-2 text-center">
                      Inventario
                    </th>
                    <th className="px-3 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => {
                    const inv = inventorySummaryByProduct[p.id];
                    return (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-gray-50"
                      >
                        {/* Nombre + descripción */}
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
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-3 text-center">
                          {p.activo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[11px] font-semibold">
                              Inactivo
                            </span>
                          )}
                        </td>

                        {/* Categorías */}
                        <td className="px-3 py-3">
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

                        {/* Inventario */}
                        <td className="px-3 py-3 text-center">
                          {inv ? (
                            <span
                              className={
                                inv.lowStock
                                  ? "text-[11px] text-red-600 font-semibold"   // 👈 rojo si stock bajo
                                  : "text-[11px] text-gray-800"
                              }
                            >
                              {inv.totalUnits} en inventario ·{" "}
                              {inv.variants} variante
                              {inv.variants !== 1 ? "s" : ""}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Sin inventario
                            </span>
                          )}
                        </td>


                        {/* Acciones */}
                        <td className="px-3 py-3">
                          <div className="flex justify-center gap-2 flex-wrap">
                            <Link
                              href={`/admin/productos/${p.id}`}
                              title="Ver y editar producto"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                 bg-sky-50 text-sky-700 border border-sky-100 text-[11px]
                 hover:bg-sky-100 hover:border-sky-200 transition-colors"
                            >
                              <span>👁️</span>
                              <span>Ver / editar</span>
                            </Link>

                            {p.activo && (
                              <button
                                onClick={() => desactivarProducto(p.id)}
                                title="Desactivar producto"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                   bg-red-50 text-red-700 border border-red-200 text-[11px]
                   hover:bg-red-100 hover:border-red-300 transition-colors"
                              >
                                <span>🚫</span>
                                <span>Desactivar</span>
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between mt-3 text-[11px] text-gray-600">
              <span>
                Mostrando{" "}
                <strong>{paginated.length}</strong> de{" "}
                <strong>{filtered.length}</strong> producto
                {filtered.length !== 1 ? "s" : ""}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  ◀
                </button>
                <span>
                  Página <strong>{page}</strong> de{" "}
                  <strong>{totalPages}</strong>
                </span>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  ▶
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
