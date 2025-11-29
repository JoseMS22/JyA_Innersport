// frontend/app/nuevo/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { useCart } from "../context/cartContext";
import { useFavorites } from "../context/favoritesContext";

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

// Modal de autenticación / avisos importantes
type AuthAlertState = {
  message: string;
} | null;

// ======================
// Card de producto (más grande)
// ======================
function ProductoNuevoCard({
  producto,
  onClick,
  onAddToCart,
  onToggleFavorite,
  isFavorite,
}: {
  producto: Producto;
  onClick: () => void;
  onAddToCart: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}) {
  function formatoPrecio(precio: number) {
    return `₡${precio.toLocaleString("es-CR")}`;
  }

  return (
    <article
      onClick={onClick}
      className="bg-white rounded-3xl border overflow-hidden hover:shadow-lg transition cursor-pointer group"
    >
      <div className="relative h-72 bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] overflow-hidden">
        {producto.imagen_principal ? (
          <img
            src={buildMediaUrl(producto.imagen_principal)!}
            alt={producto.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-3xl">
            📦
          </div>
        )}

        {/* NUEVO */}
        <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-semibold border border-white/70 text-white rounded-sm bg-black/20 backdrop-blur">
          NUEVO
        </span>

        {/* Estado stock */}
        <div className="absolute bottom-3 left-3 flex gap-1 text-[11px]">
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
      </div>

      <div className="p-4 text-sm">
        <p className="text-xs text-gray-500 mb-1">Innersport</p>
        <p className="text-gray-900 font-medium line-clamp-2 min-h-[40px]">
          {producto.nombre}
        </p>
        <p className="mt-2 text-lg font-semibold text-[#6b21a8]">
          {formatoPrecio(producto.precio_minimo)}
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="mt-3 w-full text-center text-white bg-[#a855f7] hover:bg-[#7e22ce] py-2 text-[12px] rounded-lg"
        >
          Ver detalles
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          disabled={!producto.tiene_stock}
          className="mt-2 w-full text-center text-[12px] font-semibold rounded-lg py-2 border border-[#a855f7] text-[#6b21a8] hover:bg-[#f5e9ff] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {producto.tiene_stock ? "Agregar al carrito" : "Producto agotado"}
        </button>
      </div>
    </article>
  );
}

// ======================
// Página Lo Nuevo
// ======================
export default function LoNuevoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [authAlert, setAuthAlert] = useState<AuthAlertState>(null);

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtrosDisponibles, setFiltrosDisponibles] = useState<Filtros | null>(
    null
  );

  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const [filtrosActivos, setFiltrosActivos] = useState({
    categoria: searchParams.get("categoria") || "",
    marca: "",
    color: "",
    talla: "",
    precio_min: "",
    precio_max: "",
    ordenar_por: "recientes",
    buscar: searchParams.get("buscar") || "",
  });

  // Sincronizar con query params
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

  // Filtros disponibles
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

  // Productos
  useEffect(() => {
    async function cargarProductos() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("pagina", String(pagina));
        params.set("por_pagina", "20");

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

        params.set("ordenar_por", filtrosActivos.ordenar_por || "recientes");
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

  // Auth
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

  // Auto-ocultar toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  // Handlers
  function aplicarFiltro(key: string, value: string) {
    setFiltrosActivos((prev) => ({ ...prev, [key]: value }));
    setPagina(1);
  }

  function toggleFiltro(key: string, value: string) {
    const valorActual = filtrosActivos[key as keyof typeof filtrosActivos];
    aplicarFiltro(key, valorActual === value ? "" : value);
  }

  function limpiarFiltros() {
    setFiltrosActivos((prev) => ({
      ...prev,
      categoria: "",
      marca: "",
      color: "",
      talla: "",
      precio_min: "",
      precio_max: "",
      buscar: "",
      ordenar_por: "recientes",
    }));
    setPagina(1);
    router.push("/nuevo");
  }

  function handleAddToCart(producto: Producto) {
    if (checkingAuth) {
      setAuthAlert({
        message:
          "Estamos verificando tu sesión, inténtalo de nuevo en un momento.",
      });
      return;
    }
    if (!isLoggedIn) {
      setAuthAlert({
        message: "Debes iniciar sesión para agregar productos al carrito.",
      });
      return;
    }

    const variante = {
      id: producto.id,
      precio_actual: producto.precio_minimo,
    };

    const productoInfo = { id: producto.id, nombre: producto.nombre };
    const imagenUrl = buildMediaUrl(producto.imagen_principal);

    addItem(variante as any, productoInfo as any, 1, imagenUrl);

    setAuthAlert({
    message: "El producto se añadió al carrito.",
  });
  }

  function handleToggleFavorite(producto: Producto) {
    if (checkingAuth) {
      setAuthAlert({
        message:
          "Estamos verificando tu sesión, inténtalo de nuevo en un momento.",
      });
      return;
    }
    if (!isLoggedIn) {
      setAuthAlert({
        message: "Debes iniciar sesión para guardar productos en favoritos.",
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

    setAuthAlert({
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

      {/* más ancho para que parezca sitio real de tienda */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-10">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="hover:text-[#6b21a8] hover:underline underline-offset-2"
          >
            Inicio
          </button>
          <span className="mx-1">›</span>
          <span className="text-gray-800 font-medium">Lo nuevo</span>
        </div>

        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#6b21a8]">Lo nuevo</h1>
            <p className="text-sm text-gray-600 mt-1">
              Descubre los productos más recientes agregados a la tienda.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            {loading
              ? "Cargando productos..."
              : `${total} producto${total === 1 ? "" : "s"} encontrados`}
          </div>
        </div>

        {/* Barra superior: botón filtros + ordenar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 text-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMostrarFiltros((prev) => !prev)}
              className="inline-flex items-center gap-2 text-gray-800 hover:text-[#6b21a8]"
            >
              <span className="text-lg">🎛️</span>
              <span className="font-medium">
                {mostrarFiltros ? "Ocultar filtros" : "Mostrar filtros"}
              </span>
            </button>

            {!loading && (
              <span className="hidden sm:inline text-xs text-gray-500">
                {total} resultado{total === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Ordenar estilo texto con flechita */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="hidden sm:inline">Ordenar:</span>
            <div className="relative inline-flex items-center">
              <select
                value={filtrosActivos.ordenar_por}
                onChange={(e) => aplicarFiltro("ordenar_por", e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 underline underline-offset-2 appearance-none pr-5 cursor-pointer"
              >
                <option value="recientes">Fecha: reciente a antiguo(a)</option>
                <option value="precio_asc">Precio: Menor a mayor</option>
                <option value="precio_desc">Precio: Mayor a menor</option>
                <option value="nombre_asc">Nombre: A-Z</option>
              </select>
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                ▾
              </span>
            </div>
          </div>
        </div>

        {/* === PANTALLA PARTIDA EN DOS COLUMNAS === */}
        <section className="grid grid-cols-12 gap-8 items-start mt-2">
          {/* Columna izquierda: filtros */}
          {mostrarFiltros && (
            <aside className="col-span-3 text-sm bg-white rounded-2xl border border-[#f3e8ff] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-gray-800 text-xs tracking-wide uppercase">
                  Filtrar
                </span>
                <button
                  onClick={limpiarFiltros}
                  className="text-[11px] text-[#6b21a8] hover:text-[#a855f7] disabled:text-gray-300"
                  disabled={!hayFiltrosActivos}
                >
                  Limpiar
                </button>
              </div>

              {filtrosDisponibles && (
                <div className="space-y-5">
                  {/* Marca */}
                  {filtrosDisponibles.marcas.length > 0 && (
                    <div className="border-b border-[#f3e8ff] pb-3 mb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-[11px] font-semibold text-gray-500 uppercase">
                          Marca
                        </h3>
                        <span className="text-[10px] text-gray-400">▾</span>
                      </div>
                      <div className="relative">
                        <select
                          value={filtrosActivos.marca}
                          onChange={(e) =>
                            aplicarFiltro("marca", e.target.value)
                          }
                          className="w-full text-xs py-1.5 pr-5 bg-transparent border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                        >
                          <option value="">Todas</option>
                          {filtrosDisponibles.marcas.map((marca) => (
                            <option key={marca} value={marca}>
                              {marca}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                          ▾
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Categoría */}
                  {filtrosDisponibles.categorias.length > 0 && (
                    <div className="border-b border-[#f3e8ff] pb-3 mb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-[11px] font-semibold text-gray-500 uppercase">
                          Categoría
                        </h3>
                        <span className="text-[10px] text-gray-400">▾</span>
                      </div>
                      <div className="relative">
                        <select
                          value={filtrosActivos.categoria}
                          onChange={(e) =>
                            aplicarFiltro("categoria", e.target.value)
                          }
                          className="w-full text-xs py-1.5 pr-5 bg-transparent border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                        >
                          <option value="">Todas</option>
                          {filtrosDisponibles.categorias.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                          ▾
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Color */}
                  {filtrosDisponibles.colores.length > 0 && (
                    <div className="border-b border-[#f3e8ff] pb-3 mb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-[11px] font-semibold text-gray-500 uppercase">
                          Color
                        </h3>
                        <span className="text-[10px] text-gray-400">▾</span>
                      </div>
                      <div className="relative">
                        <select
                          value={filtrosActivos.color}
                          onChange={(e) =>
                            aplicarFiltro("color", e.target.value)
                          }
                          className="w-full text-xs py-1.5 pr-5 bg-transparent border-none focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                        >
                          <option value="">Todos</option>
                          {filtrosDisponibles.colores.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                          ▾
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Talla */}
                  {filtrosDisponibles.tallas.length > 0 && (
                    <div className="border-b border-[#f3e8ff] pb-3 mb-1">
                      <h3 className="text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
                        Talla
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {filtrosDisponibles.tallas.map((talla) => (
                          <button
                            key={talla}
                            onClick={() => toggleFiltro("talla", talla)}
                            className={`px-2.5 py-1 rounded-full border text-xs ${
                              filtrosActivos.talla === talla
                                ? "border-[#a855f7] bg-[#a855f7] text-white"
                                : "border-gray-200 bg-white hover:border-[#a855f7]"
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
          )}

          {/* Columna derecha: productos */}
          <div className={mostrarFiltros ? "col-span-9" : "col-span-12"}>
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl border animate-pulse"
                  >
                    <div className="h-72 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-16 bg-white rounded-2xl border">
                No hay productos nuevos que coincidan con estos filtros.
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {productos.map((producto) => (
                    <ProductoNuevoCard
                      key={producto.id}
                      producto={producto}
                      onClick={() => router.push(`/productos/${producto.id}`)}
                      onAddToCart={() => handleAddToCart(producto)}
                      onToggleFavorite={() => handleToggleFavorite(producto)}
                      isFavorite={isFavorite(producto.id)}
                    />
                  ))}
                </div>

                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      disabled={pagina === 1}
                      onClick={() => setPagina(pagina - 1)}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 bg-white"
                    >
                      ← Anterior
                    </button>

                    {Array.from({ length: totalPaginas }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPagina(i + 1)}
                        className={`w-8 h-8 text-xs rounded-lg ${
                          pagina === i + 1
                            ? "bg-[#a855f7] text-white"
                            : "border bg-white"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      disabled={pagina === totalPaginas}
                      onClick={() => setPagina(pagina + 1)}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 bg-white"
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

      {/* Modal de autenticación / avisos importantes */}
      {authAlert && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full px-6 py-5 text-sm">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 mb-1">Atención</h2>
                <p className="text-gray-700">{authAlert.message}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAuthAlert(null)}
                className="px-4 py-1.5 rounded-lg bg-[#a855f7] text-white text-xs font-semibold hover:bg-[#7e22ce]"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg text-xs border ${
              toast.type === "success"
                ? "bg-white border-[#22c55e]/40 text-[#166534]"
                : "bg-white border-[#f97316]/40 text-[#9a3412]"
            }`}
          >
            <span className="text-lg">
              {toast.type === "success" ? "✅" : "⚠️"}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {toast.type === "success" ? "Acción realizada" : "Error"}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}