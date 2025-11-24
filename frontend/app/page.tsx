// frontend/app/page.tsx
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
// Productos "quemados" demo
// ======================
type DemoProduct = {
  id: number;
  brand: string;
  name: string;
  price: string;
  tag?: string;
  badge?: string;
};

const PRODUCTS: DemoProduct[] = [
  {
    id: 1,
    brand: "Innersport",
    name: "Sudadera running liviana",
    price: "₡29.900",
    tag: "NUEVO",
    badge: "-15%",
  },
  {
    id: 2,
    brand: "Innersport",
    name: "Leggins compresión alta",
    price: "₡24.500",
    tag: "ENVÍO RÁPIDO",
  },
  {
    id: 3,
    brand: "Innersport",
    name: "Camiseta dri-fit entrenamiento",
    price: "₡18.900",
    tag: "NUEVO",
  },
  {
    id: 4,
    brand: "Innersport",
    name: "Short running ligero",
    price: "₡16.500",
    badge: "-20%",
  },
];

// Helper para convertir "₡29.900" -> 29900
function parsePrice(price: string): number {
  const clean = price
    .replace(/[^\d,\.]/g, "")
    .replace(".", "")
    .replace(",", ".");
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
}

// Toast
type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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

  // Filtros activos - Inicializar desde URL params
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

  // Sincronizar filtros con URL al montar
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
        const res = await fetch("http://localhost:8000/api/v1/catalogo/filtros");
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
          `http://localhost:8000/api/v1/catalogo?${params.toString()}`
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

  // Check auth para carrito/favoritos
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
  // Filtros para productos demo
  // ======================
  const filteredDemoProducts = useMemo(() => {
    let list = [...PRODUCTS];

    // Buscar por nombre o marca
    if (filtrosActivos.buscar) {
      const q = filtrosActivos.buscar.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    // Filtro de precio
    let min = filtrosActivos.precio_min ? Number(filtrosActivos.precio_min) : 0;
    let max = filtrosActivos.precio_max ? Number(filtrosActivos.precio_max) : Infinity;

    if (min || filtrosActivos.precio_min === "0") {
      list = list.filter((p) => parsePrice(p.price) >= min);
    }
    if (filtrosActivos.precio_max) {
      list = list.filter((p) => parsePrice(p.price) <= max);
    }

    // Ordenar
    if (filtrosActivos.ordenar_por === "precio_asc") {
      list = list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (filtrosActivos.ordenar_por === "precio_desc") {
      list = list.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (filtrosActivos.ordenar_por === "nombre_asc") {
      list = list.sort((a, b) => a.name.localeCompare(b.name));
    }
    // "destacados" se deja como está

    return list;
  }, [filtrosActivos]);

  const estaUsandoDemo = !loading && productos.length === 0;

  // Búsqueda desde SearchBar
  function handleSearch(query: string) {
    if (query.startsWith("categoria:")) {
      const categoria = query.replace("categoria:", "");
      aplicarFiltro("categoria", categoria);
      aplicarFiltro("buscar", "");
    } else {
      aplicarFiltro("buscar", query);
    }
  }

  // Aplicar filtro
  function aplicarFiltro(key: string, value: string) {
    setFiltrosActivos((prev) => ({ ...prev, [key]: value }));
    setPagina(1);
  }

  // Toggle filtro (para talla por ejemplo)
  function toggleFiltro(key: string, value: string) {
    const valorActual = filtrosActivos[key as keyof typeof filtrosActivos];
    const nuevoValor = valorActual === value ? "" : value;
    aplicarFiltro(key, nuevoValor);
  }

  // Limpiar filtros
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

  // Filtro de precio
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

  const hayFiltrosActivos = Object.entries(filtrosActivos).some(
    ([key, value]) => value && key !== "ordenar_por"
  );

  // ======================
  // Handlers para demo PRODUCTS
  // ======================
  const handleAddToCartDemo = (p: DemoProduct) => {
    const priceNumber = parsePrice(p.price);

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

    const variante = {
      id: p.id,
      precio_actual: priceNumber,
    };

    const producto = {
      id: p.id,
      nombre: p.name,
      brand: p.brand,
    };

    const imagenUrl = null;

    addItem(variante as any, producto as any, 1, imagenUrl);

    setToast({
      type: "success",
      message: "El producto se añadió al carrito.",
    });
  };

  const handleToggleFavoriteDemo = (p: DemoProduct) => {
    const priceNumber = parsePrice(p.price);

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

    const alreadyFav = isFavorite(p.id);

    const favItem = {
      id: p.id,
      productoId: p.id,
      name: p.name,
      brand: p.brand,
      price: priceNumber,
      imagenUrl: null,
    };

    toggleFavorite(favItem);

    setToast({
      type: "success",
      message: alreadyFav
        ? "El producto se quitó de favoritos."
        : "Producto guardado en favoritos.",
    });
  };

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Migas de pan */}
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

        {/* Hero tipo banner */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Izquierda */}
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
                urbano. Diseñada para acompañarte dentro y fuera de la pista.
              </p>
              <button
                onClick={() => {
                  const element = document.querySelector("#productos-section");
                  const rect = element?.getBoundingClientRect();
                  if (rect) {
                    window.scrollTo({
                      top: rect.top + window.scrollY - 80,
                      behavior: "smooth",
                    });
                  }
                }}
                className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-white/95 text-[#6b21a8] text-xs font-semibold shadow hover:bg-white transition-all"
              >
                Ver productos →
              </button>
            </div>
          </div>

          {/* Derecha */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tl from-[#111827] via-[#1f2937] to-[#6b21a8] min-h-[260px] flex items-end justify-end p-6">
            <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.8),_transparent_60%)]" />
            <div className="relative max-w-xs text-right ml-auto">
              <p className="uppercase text-xs font-semibold tracking-[0.25em] text-[#e5e7eb]/80">
                RUNNING & TRAINING
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Movimiento que se siente bien
              </h2>
              <p className="mt-3 text-xs text-gray-300">
                Telas ligeras, secado rápido y soporte donde más lo necesitas.
              </p>
            </div>
          </div>
        </section>

        {/* Badge de búsqueda activa */}
        {filtrosActivos.buscar && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-gray-600">Buscando:</span>
            <span className="px-3 py-1 bg-[#a855f7] text:white rounded-full font-medium flex items-center gap-2 text-white">
              "{filtrosActivos.buscar}"
              <button
                onClick={() => aplicarFiltro("buscar", "")}
                className="hover:bg-white/20 rounded-full p-0.5"
                aria-label="Limpiar búsqueda"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Filtros + listado */}
        <section
          id="productos-section"
          className="grid md:grid-cols-[260px,1fr] gap-6"
        >
          {/* Filtros laterales */}
          <aside className="bg-white/90 rounded-2xl border border-[#e5e7eb] p-4 text-sm h-fit">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800">Filtrar</span>
              <button
                onClick={limpiarFiltros}
                className="text-xs text-[#6b21a8] hover:text-[#a855f7] transition-colors"
                disabled={!hayFiltrosActivos}
              >
                Limpiar
              </button>
            </div>

            {/* Barra de búsqueda destacada */}
            <div className="mb-6">
              <SearchBar
                onSearch={handleSearch}
                className="max-w-2xl mx-auto"
              />
            </div>

            {filtrosDisponibles && (
              <div className="space-y-4">
                {/* Categoría */}
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
                      className="w-full text-xs px-2 py-1.5 border rounded-lg focus:border-[#a855f7] outline-none"
                    >
                      <option value="">Todas las categorías</option>
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
                      className="w-full text-xs px-2 py-1.5 border rounded-lg focus:border-[#a855f7] outline-none"
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

                {/* Color */}
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
                      className="w-full text-xs px-2 py-1.5 border rounded-lg focus:border-[#a855f7] outline-none"
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

                {/* Talla */}
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
                          className={`px-2 py-1 rounded-full border transition-all ${
                            filtrosActivos.talla === talla
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

                {/* Precio */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Precio
                  </h3>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#6b21a8]">
                      <input
                        type="radio"
                        name="precio"
                        className="accent-[#a855f7]"
                        checked={
                          !filtrosActivos.precio_min &&
                          !filtrosActivos.precio_max
                        }
                        onChange={() => aplicarFiltroPrecio("", "")}
                      />
                      Todos
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#6b21a8]">
                      <input
                        type="radio"
                        name="precio"
                        className="accent-[#a855f7]"
                        checked={filtrosActivos.precio_max === "20000"}
                        onChange={() => aplicarFiltroPrecio("", "20000")}
                      />
                      Hasta ₡20.000
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#6b21a8]">
                      <input
                        type="radio"
                        name="precio"
                        className="accent-[#a855f7]"
                        checked={
                          filtrosActivos.precio_min === "20000" &&
                          filtrosActivos.precio_max === "35000"
                        }
                        onChange={() => aplicarFiltroPrecio("20000", "35000")}
                      />
                      ₡20.000 - ₡35.000
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#6b21a8]">
                      <input
                        type="radio"
                        name="precio"
                        className="accent-[#a855f7]"
                        checked={filtrosActivos.precio_min === "35000"}
                        onChange={() => aplicarFiltroPrecio("35000", "")}
                      />
                      Más de ₡35.000
                    </label>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Grid de productos */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
              <span>
                {loading
                  ? "Cargando..."
                  : estaUsandoDemo
                  ? `${filteredDemoProducts.length} producto${
                      filteredDemoProducts.length === 1 ? "" : "s"
                    } demo`
                  : `${total} ${
                      total === 1 ? "producto" : "productos"
                    } disponibles`}
              </span>
              <select
                value={filtrosActivos.ordenar_por}
                onChange={(e) =>
                  aplicarFiltro("ordenar_por", e.target.value)
                }
                className="text-xs px-2 py-1 border rounded-lg hover:border-[#a855f7] outline-none cursor-pointer"
              >
                <option value="destacados">Destacados</option>
                <option value="precio_asc">Precio: Menor a mayor</option>
                <option value="precio_desc">Precio: Mayor a menor</option>
                <option value="nombre_asc">Nombre: A-Z</option>
              </select>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden animate-pulse"
                  >
                    <div className="h-44 bg-gray-200"></div>
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : productos.length === 0 ? (
              // 🔹 Fallback: productos quemados (filtrados)
              <>
                <div className="mb-4 text-xs text-gray-600">
                  Mostrando una selección de productos destacados mientras se
                  cargan los productos del catálogo.
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {filteredDemoProducts.length === 0 ? (
                    <div className="col-span-full text-center text-xs text-gray-500 py-10">
                      No hay productos que coincidan con los filtros.
                    </div>
                  ) : (
                    filteredDemoProducts.map((p) => (
                      <article
                        key={p.id}
                        className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="relative h-44 bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7]">
                          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_white,_transparent_60%)]" />
                          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 text-[10px]">
                            {p.badge && (
                              <span className="px-1.5 py-0.5 rounded bg-white/90 text-red-600 font-semibold">
                                {p.badge}
                              </span>
                            )}
                            {p.tag && (
                              <span className="px-1.5 py-0.5 rounded bg-[#fef9c3] text-[#854d0e] font-semibold">
                                {p.tag}
                              </span>
                            )}
                          </div>

                          {/* Botón favorito (corazón) */}
                          <button
                            type="button"
                            onClick={() => handleToggleFavoriteDemo(p)}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-sm shadow hover:bg-white"
                          >
                            <span
                              className={
                                isFavorite(p.id)
                                  ? "text-red-500"
                                  : "text-gray-500"
                              }
                            >
                              {isFavorite(p.id) ? "♥" : "♡"}
                            </span>
                          </button>
                        </div>

                        <div className="p-3 text-xs">
                          <p className="text-gray-500">{p.brand}</p>
                          <p className="mt-1 text-gray-900">{p.name}</p>
                          <p className="mt-2 font-semibold text-[#6b21a8]">
                            {p.price}
                          </p>
                          <button
                            className="mt-2 w-full text-center text-[11px] font-semibold text-white bg-[#a855f7] hover:bg-[#7e22ce] rounded-lg py-1.5"
                            type="button"
                            onClick={() => handleAddToCartDemo(p)}
                          >
                            Agregar al carrito
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Productos reales del catálogo */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {productos.map((producto) => (
                    <article
                      key={producto.id}
                      onClick={() =>
                        router.push(`/productos/${producto.id}`)
                      }
                      className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="relative h-44 bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] overflow-hidden">
                        {producto.imagen_principal ? (
                          <img
                            src={producto.imagen_principal}
                            alt={producto.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_white,_transparent_60%)]" />
                        )}

                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 text-[10px]">
                          {!producto.tiene_stock && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold">
                              AGOTADO
                            </span>
                          )}
                          {producto.tiene_stock && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              DISPONIBLE
                            </span>
                          )}
                          {producto.categorias.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#fef9c3] text-[#854d0e] font-semibold">
                              {producto.categorias[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 text-xs">
                        <p className="text-gray-500">Innersport</p>
                        <p className="mt-1 text-gray-900 line-clamp-2">
                          {producto.nombre}
                        </p>
                        <p className="mt-2 font-semibold text-[#6b21a8]">
                          {formatoPrecio(producto.precio_minimo)}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/productos/${producto.id}`);
                          }}
                          className="mt-2 w-full text-center text-[11px] font-semibold text:white bg-[#a855f7] hover:bg-[#7e22ce] rounded-lg py-1.5 transition-colors text-white"
                        >
                          Ver detalles
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
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#a855f7] hover:bg-[#a855f7] hover:text-white transition-all"
                    >
                      ← Anterior
                    </button>

                    {Array.from(
                      { length: Math.min(totalPaginas, 5) },
                      (_, i) => {
                        let num;
                        if (totalPaginas <= 5) {
                          num = i + 1;
                        } else if (pagina <= 3) {
                          num = i + 1;
                        } else if (pagina >= totalPaginas - 2) {
                          num = totalPaginas - 4 + i;
                        } else {
                          num = pagina - 2 + i;
                        }

                        return (
                          <button
                            key={num}
                            onClick={() => setPagina(num)}
                            className={`w-8 h-8 text-xs rounded-lg transition-all ${
                              pagina === num
                                ? "bg-[#a855f7] text-white font-semibold"
                                : "border hover:border-[#a855f7]"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      }
                    )}

                    <button
                      disabled={pagina === totalPaginas}
                      onClick={() => setPagina(pagina + 1)}
                      className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#a855f7] hover:bg-[#a855f7] hover:text-white transition-all"
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

      {/* Toast flotante */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg text-xs border ${
              toast.type === "success"
                ? "bg-white/95 border-[#22c55e]/40 text-[#166534]"
                : "bg-white/95 border-[#f97316]/40 text-[#9a3412]"
            }`}
          >
            <span className="text-lg">
              {toast.type === "success" ? "✅" : "⚠️"}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {toast.type === "success"
                  ? "Acción realizada"
                  : "No se pudo completar"}
              </span>
              <span>{toast.message}</span>
              {toast.type === "error" && !isLoggedIn && (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="mt-1 self-start text-[11px] font-semibold text-[#6b21a8] hover:text-[#a855f7]"
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}