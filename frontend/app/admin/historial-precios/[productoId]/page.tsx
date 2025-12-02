"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  // opcional si existe en tu modelo
  vigente_hasta?: string | null;
};

type Variante = {
  id: number;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  talla: string | null;
  precio_actual: number;
  activo: boolean;
  historial_precios: HistorialPrecio[];
};

export default function HistorialPreciosDetalleProductoPage() {
  const router = useRouter();
  const { productoId } = useParams();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const [pRes, vRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/productos/${productoId}`, {
            credentials: "include",
          }),
          fetch(
            `${API_BASE}/api/v1/variantes/productos/${productoId}/variantes`,
            { credentials: "include" }
          ),
        ]);

        if (!pRes.ok) {
          throw new Error("No se pudo cargar el producto.");
        }
        if (!vRes.ok) {
          throw new Error("No se pudieron cargar las variantes.");
        }

        const pData: Producto = await pRes.json();
        const vData: Variante[] = await vRes.json();

        setProducto(pData);
        setVariantes(vData);
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
  }, [productoId]);

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return "Actual";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("es-CR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getCambiosCount(v: Variante) {
    const len = v.historial_precios?.length || 0;
    if (len === 0) return 0;
    // asumimos 1 inicial + n cambios
    return Math.max(len - 1, 0);
  }

  if (loading) {
    return (
      <p className="text-xs text-gray-500">
        Cargando historial de precios...
      </p>
    );
  }

  if (!producto) {
    return (
      <div className="space-y-3">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}
        <p className="text-xs text-red-500">
          No se encontró el producto.
        </p>
        <button
          onClick={() => router.push("/admin/historial-precios")}
          className="mt-2 text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Volver al resumen
        </button>
      </div>
    );
  }

  const totalVariantes = variantes.length;
  const totalRegistros = variantes.reduce(
    (acc, v) => acc + (v.historial_precios?.length || 0),
    0
  );
  const totalCambios = variantes.reduce(
    (acc, v) => acc + getCambiosCount(v),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Historial de precios · {producto.nombre}
          </h1>
          <p className="text-xs text-gray-500">
            Consulta la evolución de precios por variante.
          </p>
          {producto.descripcion && (
            <p className="mt-1 text-[11px] text-gray-500 max-w-xl">
              {producto.descripcion}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {producto.categorias?.map((c) => (
              <span
                key={c.id}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-700"
              >
                {c.nombre}
              </span>
            ))}

            <span
              className={
                producto.activo
                  ? "px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700 border border-emerald-100"
                  : "px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 border border-gray-200"
              }
            >
              {producto.activo ? "Producto activo" : "Producto inactivo"}
            </span>
          </div>

        </div>

        <button
          onClick={() => router.push("/admin/historial-precios")}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Volver al resumen
        </button>
      </header>

      {/* Resumen numérico */}
      <section className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] text-gray-500">Variantes</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {totalVariantes}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] text-gray-500">
            Registros en historial
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {totalRegistros}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] text-gray-500">
            Cambios de precio
          </p>
          <p className="mt-1 text-lg font-bold text-[#6b21a8]">
            {totalCambios}
          </p>
          <p className="text-[10px] text-gray-500">
            (excluye el precio inicial)
          </p>
        </div>
      </section>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Detalle por variante */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 text-xs space-y-4 shadow-sm">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">
            Detalle por variante
          </h2>
          <p className="text-[11px] text-gray-500">
            Cada tarjeta muestra el historial de precios de una
            variante (talla / color / SKU).
          </p>
        </div>

        {variantes.length === 0 ? (
          <p className="text-[11px] text-gray-400">
            Este producto aún no tiene variantes registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {variantes.map((v) => {
              const cambios = getCambiosCount(v);
              const historialOrdenado = [...(v.historial_precios || [])].sort(
                (a, b) =>
                  new Date(b.vigente_desde).getTime() -
                  new Date(a.vigente_desde).getTime()
              );

              return (
                <div
                  key={v.id}
                  className="border border-gray-200 rounded-2xl p-3 bg-gray-50"
                >
                  {/* Header variante */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Variante #{v.id}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 text-[11px] text-gray-600">
                        {v.color && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                            Color: {v.color}
                          </span>
                        )}
                        {v.talla && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                            Talla: {v.talla}
                          </span>
                        )}
                        {v.sku && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                            SKU: {v.sku}
                          </span>
                        )}
                        {v.barcode && (
                          <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200">
                            Código barras: {v.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-gray-600">
                      <div>
                        Precio actual:{" "}
                        <span className="font-semibold text-[#6b21a8]">
                          ₡{v.precio_actual.toLocaleString("es-CR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div>
                        Cambios de precio:{" "}
                        <span className="font-semibold">
                          {cambios}
                        </span>
                      </div>
                      <div>
                        Estado:{" "}
                        {v.activo ? (
                          <span className="text-green-600 font-semibold">
                            Activa
                          </span>
                        ) : (
                          <span className="text-gray-500 font-semibold">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Historial timeline */}
                  {historialOrdenado.length === 0 ? (
                    <p className="text-[11px] text-gray-400">
                      Sin registros en el historial de precios.
                    </p>
                  ) : (
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      <p className="text-[11px] text-gray-500 mb-1">
                        Historial (del más reciente al más antiguo):
                      </p>
                      <div className="space-y-2">
                        {historialOrdenado.map((h, idx) => (
                          <div
                            key={h.id}
                            className="flex items-start gap-2"
                          >
                            {/* mini timeline marker */}
                            <div className="flex flex-col items-center mt-1">
                              <div className="w-2 h-2 rounded-full bg-[#a855f7]" />
                              {idx !== historialOrdenado.length - 1 && (
                                <div className="w-px h-6 bg-gray-300" />
                              )}
                            </div>

                            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-gray-600">
                                  Precio:
                                  <span className="font-semibold text-[#6b21a8] ml-1">
                                    ₡{h.precio.toLocaleString("es-CR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Desde: {formatDate(h.vigente_desde)}
                                </span>
                              </div>
                              {h.vigente_hasta && (
                                <div className="mt-0.5 text-[10px] text-gray-400">
                                  Hasta: {formatDate(h.vigente_hasta)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
