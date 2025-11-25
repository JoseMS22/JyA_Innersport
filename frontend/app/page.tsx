"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainMenu } from "../components/MainMenu";
import { SearchBar } from "../components/SearchBar";
import { useCart } from "./context/cartContext";
import { useFavorites } from "./context/favoritesContext";

// ======================
// Tipos del catálogo real (API)
// ======================
type Producto = {
  id: number;
  nombre: string;
  precio_minimo: number;
  imagen_principal: string | null;
  categorias: string[];
  tiene_stock: boolean;
};

type CatalogoResponse = {
  productos: Producto[];
  total: number;
  pagina: number;
  total_paginas: number;
  por_pagina: number;
};

type Filtros = {
  categorias: string[];
  marcas: string[];
  colores: string[];
  tallas: string[];
  precio_minimo: number;
  precio_maximo: number;
};

// ======================
// API BASE + Helper imágenes
// ======================
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildMediaUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

// Toast
type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Estados catálogo
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtrosDisponibles, setFiltrosDisponibles] = useState<Filtros | null>(
    null
  );

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros activos
  const [filtrosActivos, setFiltrosActivos] = useState({
    categoria: searchParams.get("categoria") || "",
    marca: "",
    color: "",
    talla: "",
    precio_min: "",
    precio_max: "",
    ordenar_por: "destacados",
    buscar: searchParams.get("buscar") || "",
  });

  useEffect(() => {
    const categoriaUrl = searchParams.get("categoria");
    const buscarUrl = searchParams.get("buscar");

    if (categoriaUrl || buscarUrl) {
      setFiltrosActivos((prev) => ({
        ...prev,
        categoria: categoriaUrl || prev.categoria,
        buscar: buscarUrl || prev.buscar,
      }));
    }
  }, [searchParams]);

  // Cargar filtros disponibles
  useEffect(() => {
    async function cargarFiltros() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/catalogo/filtros`);
        const data = await res.json();
        setFiltrosDisponibles(data);
      } catch (error) {
        console.error("Error cargando filtros:", error);
      }
    }
    cargarFiltros();
  }, []);

  // Cargar productos desde API
  useEffect(() => {
    async function cargarProductos() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("pagina", String(pagina));
        params.set("por_pagina", "6");

        if (filtrosActivos.categoria)
          params.set("categoria", filtrosActivos.categoria);
        if (filtrosActivos.marca) params.set("marca", filtrosActivos.marca);
        if (filtrosActivos.color) params.set("color", filtrosActivos.color);
        if (filtrosActivos.talla) params.set("talla", filtrosActivos.talla);
        if (filtrosActivos.precio_min)
          params.set("precio_min", filtrosActivos.precio_min);
        if (filtrosActivos.precio_max)
          params.set("precio_max", filtrosActivos.precio_max);
        if (filtrosActivos.buscar)
          params.set("buscar", filtrosActivos.buscar);
        params.set("ordenar_por", filtrosActivos.ordenar_por);
        params.set("solo_disponibles", "true");

        const res = await fetch(
          `${API_BASE_URL}/api/v1/catalogo?${params.toString()}`
        );
        const data: CatalogoResponse = await res.json();

        setProductos(data.productos);
        setTotal(data.total);
        setTotalPaginas(data.total_paginas);
      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarProductos();
  }, [pagina, filtrosActivos]);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });
        setIsLoggedIn(res.ok);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // Auto ocultar toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  // ======================
  // Handlers
  // ======================

  function handleSearch(query: string) {
    aplicarFiltro("buscar", query);
  }

  function aplicarFiltro(key: string, value: string) {
    setFiltrosActivos((prev) => ({ ...prev, [key]: value }));
    setPagina(1);
  }

  function toggleFiltro(key: string, value: string) {
    const valorActual = filtrosActivos[key as keyof typeof filtrosActivos];
    aplicarFiltro(key, valorActual === value ? "" : value);
  }

  function limpiarFiltros() {
    setFiltrosActivos({
      categoria: "",
      marca: "",
      color: "",
      talla: "",
      precio_min: "",
      precio_max: "",
      ordenar_por: "destacados",
      buscar: "",
    });
    setPagina(1);
    router.push("/");
  }

  function aplicarFiltroPrecio(min: string, max: string) {
    setFiltrosActivos((prev) => ({
      ...prev,
      precio_min: min,
      precio_max: max,
    }));
    setPagina(1);
  }

  function formatoPrecio(precio: number) {
    return `₡${precio.toLocaleString("es-CR")}`;
  }

  function handleAddToCart(producto: Producto) {
    if (checkingAuth) {
      setToast({
        type: "error",
        message:
          "Estamos verificando tu sesión, inténtalo de nuevo en un momento.",
      });
      return;
    }

    if (!isLoggedIn) {
      setToast({
        type: "error",
        message: "Debes iniciar sesión para agregar productos al carrito.",
      });
      return;
    }

    // Por ahora usamos el id del producto como id de la "variante"
    const variante = {
      id: producto.id,
      precio_actual: producto.precio_minimo,
    };

    const productoInfo = {
      id: producto.id,
      nombre: producto.nombre,
    };

    const imagenUrl = buildMediaUrl(producto.imagen_principal);

    addItem(variante as any, productoInfo as any, 1, imagenUrl);

    setToast({
      type: "success",
      message: "El producto se añadió al carrito.",
    });
  }

  // 🔹 Favoritos para productos reales
  function handleToggleFavorite(producto: Producto) {
    if (checkingAuth) {
      setToast({
        type: "error",
        message:
          "Estamos verificando tu sesión, inténtalo de nuevo en un momento.",
      });
      return;
    }

    if (!isLoggedIn) {
      setToast({
        type: "error",
        message: "Debes iniciar sesión para guardar productos favoritos.",
      });
      return;
    }

    const alreadyFav = isFavorite(producto.id);

    const favItem = {
      id: producto.id,
      productoId: producto.id,
      name: producto.nombre,
      brand: "Innersport",
      price: producto.precio_minimo,
      imagenUrl: buildMediaUrl(producto.imagen_principal),
    };

    toggleFavorite(favItem);

    setToast({
      type: "success",
      message: alreadyFav
        ? "El producto se quitó de favoritos."
        : "Producto guardado en favoritos.",
    });
  }

  const hayFiltrosActivos = Object.entries(filtrosActivos).some(
    ([key, value]) => value && key !== "ordenar_por"
  );

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Migas */}
        <div className="text-xs text-gray-500 mb-4">
          Inicio <span className="mx-1">›</span>{" "}
          <span className="text-gray-800 font-medium">
            {filtrosActivos.buscar
              ? `Resultados para "${filtrosActivos.buscar}"`
              : filtrosActivos.categoria
                ? filtrosActivos.categoria
                : "Colección Innersport"}
          </span>
        </div>

        {/* Hero */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f97316] via-[#facc15] to-[#fef3c7] min-h-[260px] flex items-end p-6">
            <div>
              <p className="uppercase text-xs font-semibold tracking-[0.2em] text-white/90">
                NUEVA TEMPORADA
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-extrabold text-white drop-shadow">
                Colección Innersport
              </h1>
              <p className="mt-3 text-sm text-white/90 max-w-md">
                Ropa deportiva pensada para entrenamiento, running y estilo
                urbano.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tl from-[#111827] via-[#1f2937] to-[#6b21a8] min-h-[260px] flex items-end justify-end p-6">
            <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.8),_transparent_60%)]" />
            <div className="relative max-w-xs text-right ml-auto">
              <p className="uppercase text-xs font-semibold tracking-[0.25em] text-[#e5e7eb]/80">
                RUNNING & TRAINING
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Movimiento que se siente bien
              </h2>
            </div>
          </div>
        </section>

        {/* Filtros + listado */}
        <section className="grid md:grid-cols-[260px,1fr] gap-6">
          {/* FILTROS LATERALES */}
          <aside className="bg-white/90 rounded-2xl border p-4 text-sm h-fit">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800">Filtrar</span>
              <button
                onClick={limpiarFiltros}
                className="text-xs text-[#6b21a8] hover:text-[#a855f7]"
                disabled={!hayFiltrosActivos}
              >
                Limpiar
              </button>
            </div>

            {/* Barra de búsqueda */}
            <div className="mb-6">
              <SearchBar onSearch={handleSearch} />
            </div>

            {filtrosDisponibles && (
              <div className="space-y-4">
                {/* Categorías */}
                {filtrosDisponibles.categorias.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Categoría
                    </h3>
                    <select
                      value={filtrosActivos.categoria}
                      onChange={(e) =>
                        aplicarFiltro("categoria", e.target.value)
                      }
                      className="w-full text-xs px-2 py-1.5 border rounded-lg"
                    >
                      <option value="">Todas</option>
                      {filtrosDisponibles.categorias.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Marca */}
                {filtrosDisponibles.marcas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Marca
                    </h3>
                    <select
                      value={filtrosActivos.marca}
                      onChange={(e) =>
                        aplicarFiltro("marca", e.target.value)
                      }
                      className="w-full text-xs px-2 py-1.5 border rounded-lg"
                    >
                      <option value="">Todas</option>
                      {filtrosDisponibles.marcas.map((marca) => (
                        <option key={marca} value={marca}>
                          {marca}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Colores */}
                {filtrosDisponibles.colores.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Color
                    </h3>
                    <select
                      value={filtrosActivos.color}
                      onChange={(e) =>
                        aplicarFiltro("color", e.target.value)
                      }
                      className="w-full text-xs px-2 py-1.5 border rounded-lg"
                    >
                      <option value="">Todos</option>
                      {filtrosDisponibles.colores.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tallas */}
                {filtrosDisponibles.tallas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Talla
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {filtrosDisponibles.tallas.map((talla) => (
                        <button
                          key={talla}
                          onClick={() => toggleFiltro("talla", talla)}
                          className={`px-2 py-1 rounded-full border ${filtrosActivos.talla === talla
                            ? "border-[#a855f7] bg-[#a855f7] text-white"
                            : "border-gray-200 hover:border-[#a855f7]"
                            }`}
                        >
                          {talla}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* GRID DE PRODUCTOS */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
              <span>
                {loading
                  ? "Cargando..."
                  : `${total} producto${total === 1 ? "" : "s"} disponibles`}
              </span>

              <select
                value={filtrosActivos.ordenar_por}
                onChange={(e) =>
                  aplicarFiltro("ordenar_por", e.target.value)
                }
                className="text-xs px-2 py-1 border rounded-lg"
              >
                <option value="destacados">Destacados</option>
                <option value="precio_asc">Precio: Menor a mayor</option>
                <option value="precio_desc">Precio: Mayor a menor</option>
                <option value="nombre_asc">Nombre: A-Z</option>
              </select>
            </div>

            {/* Loading skeleton */}
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border animate-pulse"
                  >
                    <div className="h-44 bg-gray-200"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-10">
                No hay productos con estos filtros.
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {productos.map((producto) => (
                    <article
                      key={producto.id}
                      onClick={() => router.push(`/productos/${producto.id}`)}
                      className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="relative h-44 bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] overflow-hidden">
                        {producto.imagen_principal ? (
                          <img
                            src={buildMediaUrl(producto.imagen_principal)!}
                            alt={producto.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-white">
                            📦
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 flex gap-1 text-[10px]">
                          {!producto.tiene_stock && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white font-semibold rounded">
                              AGOTADO
                            </span>
                          )}
                          {producto.tiene_stock && (
                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white font-semibold rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              DISPONIBLE
                            </span>
                          )}
                        </div>

                        {/* 🔹 Botón de favoritos (corazón) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(producto);
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-sm shadow hover:bg-white"
                        >
                          <span
                            className={
                              isFavorite(producto.id) ? "text-red-500" : "text-gray-500"
                            }
                          >
                            {isFavorite(producto.id) ? "♥" : "♡"}
                          </span>
                        </button>
                      </div>

                      <div className="p-3 text-xs">
                        <p className="text-gray-500">Innersport</p>
                        <p className="mt-1 line-clamp-2 text-gray-900">
                          {producto.nombre}
                        </p>
                        <p className="mt-2 font-semibold text-[#6b21a8]">
                          {formatoPrecio(producto.precio_minimo)}
                        </p>

                        {/* 🔹 Botón Ver detalles */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/productos/${producto.id}`);
                          }}
                          className="mt-2 w-full text-center text-white bg-[#a855f7] hover:bg-[#7e22ce] py-1.5 text-[11px] rounded-lg"
                        >
                          Ver detalles
                        </button>

                        {/* 🔹 Botón Agregar al carrito */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(producto);
                          }}
                          disabled={!producto.tiene_stock}
                          className="mt-2 w-full text-center text-[11px] font-semibold rounded-lg py-1.5 border border-[#a855f7] text-[#6b21a8] hover:bg-[#f5e9ff] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {producto.tiene_stock ? "Agregar al carrito" : "Producto agotado"}
                        </button>
                      </div>
                    </article>
                  ))}

                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      disabled={pagina === 1}
                      onClick={() => setPagina(pagina - 1)}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50"
                    >
                      ← Anterior
                    </button>

                    {Array.from({ length: totalPaginas }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPagina(i + 1)}
                        className={`w-8 h-8 text-xs rounded-lg ${pagina === i + 1
                          ? "bg-[#a855f7] text-white"
                          : "border"
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      disabled={pagina === totalPaginas}
                      onClick={() => setPagina(pagina + 1)}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg text-xs border ${toast.type === "success"
              ? "bg-white border-[#22c55e]/40 text-[#166534]"
              : "bg-white border-[#f97316]/40 text-[#9a3412]"
              }`}
          >
            <span className="text-lg">
              {toast.type === "success" ? "✅" : "⚠️"}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {toast.type === "success"
                  ? "Acción realizada"
                  : "Error"}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
