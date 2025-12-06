"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { useCart } from "@/app/context/cartContext";
import { useFavorites } from "@/app/context/favoritesContext";

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
  created_at: string;
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

function esNuevo(producto: Producto) {
  const creado = new Date(producto.created_at);
  if (Number.isNaN(creado.getTime())) return false;

  const ahora = new Date();
  const diffMs = ahora.getTime() - creado.getTime();
  const diffDias = diffMs / (1000 * 60 * 60 * 24);

  return diffDias <= 30;
}

function prettyFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}



// Toast
type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

// ======================
// Card de producto
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
      className="bg-white rounded-3xl border overflow-hidden hover:shadow-lg transition cursor-pointer group flex flex-col h-full"
    >

      <div className="relative h-64 sm:h-72 lg:h-80 bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] overflow-hidden">
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

        {/* NUEVO solo si tiene <= 30 días */}
        {esNuevo(producto) && (
          <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-semibold border border-white/70 text-white rounded-sm bg-black/20 backdrop-blur">
            NUEVO
          </span>
        )}


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

        {/* Favoritos */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-base shadow hover:bg-white"
        >
          <span className={isFavorite ? "text-red-500" : "text-gray-500"}>
            {isFavorite ? "♥" : "♡"}
          </span>
        </button>
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
// Componente genérico Catálogo
// ======================
type CatalogoPageProps = {
  /** Título que se muestra (Lo nuevo, Ropa Deportiva, etc.) */
  titulo?: string;
  initialCategoria?: string;
  initialCategoriaSlug?: string;      // para /categorias/ropa-deportiva
  initialPrincipalSlug?: string;      // para /categorias/ropa-deportiva/mujer
  initialSecundariaSlug?: string;
};

export function CatalogoPage({
  titulo = "Lo nuevo",
  initialCategoria = "",
  initialCategoriaSlug = "",
  initialPrincipalSlug = "",
  initialSecundariaSlug = "",
}: CatalogoPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openMarca, setOpenMarca] = useState(false);
  const [openCategoria, setOpenCategoria] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openOrden, setOpenOrden] = useState(false);

  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtrosDisponibles, setFiltrosDisponibles] = useState<Filtros | null>(
    null
  );

  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const buscarInicial = searchParams.get("buscar") || "";

  const [filtrosActivos, setFiltrosActivos] = useState({
    categoria: "", // 👈 viene por props
    marca: "",
    color: "",
    talla: "",
    precio_min: "",
    precio_max: "",
    ordenar_por: "recientes",
    buscar: buscarInicial,

    categoria_slug: initialCategoriaSlug,
    principal_slug: initialPrincipalSlug,
    secundaria_slug: initialSecundariaSlug,
  });

  // Solo sincronizamos "buscar" desde la URL, NO la categoría
  useEffect(() => {
    const buscarUrl = searchParams.get("buscar");
    setFiltrosActivos((prev) => ({
      ...prev,
      buscar: buscarUrl || "",
    }));
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
        if (filtrosActivos.categoria_slug)
          params.set("categoria_slug", filtrosActivos.categoria_slug);

        if (filtrosActivos.principal_slug)
          params.set("principal_slug", filtrosActivos.principal_slug);

        if (filtrosActivos.secundaria_slug)
          params.set("secundaria_slug", filtrosActivos.secundaria_slug);
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

  function toggleOpcionMultiple(
    key: "marca" | "categoria" | "color",
    opcion: string
  ) {
    setFiltrosActivos((prev) => {
      const actual = (prev as any)[key] as string;
      const partes = actual ? actual.split(",").filter(Boolean) : [];
      const yaEsta = partes.includes(opcion);

      const nuevasPartes = yaEsta
        ? partes.filter((p) => p !== opcion)
        : [...partes, opcion];

      return {
        ...prev,
        [key]: nuevasPartes.join(","), // guardamos "Nike,Adidas"
      };
    });
    setPagina(1);
  }

  function limpiarFiltros() {
    setFiltrosActivos((prev) => ({
      ...prev,
      categoria: "", // 👈 volvemos a la categoría base de la página
      marca: "",
      color: "",
      talla: "",
      precio_min: "",
      precio_max: "",
      buscar: "",
      ordenar_por: "recientes",
    }));
    setPagina(1);
    // ya NO hacemos router.push("/nuevo"), porque este componente también
    // se usa en /categorias/[slug]
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

    const variante = {
      id: producto.id,
      precio_actual: producto.precio_minimo,
    };

    const productoInfo = { id: producto.id, nombre: producto.nombre };
    const imagenUrl = buildMediaUrl(producto.imagen_principal);

    addItem(variante as any, productoInfo as any, 1, imagenUrl);

    setToast({
      type: "success",
      message: "El producto se añadió al carrito.",
    });
  }

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

  const marcasSeleccionadas = filtrosActivos.marca
    ? filtrosActivos.marca.split(",").filter(Boolean)
    : [];
  const categoriasSeleccionadas = filtrosActivos.categoria
    ? filtrosActivos.categoria.split(",").filter(Boolean)
    : [];
  const coloresSeleccionados = filtrosActivos.color
    ? filtrosActivos.color.split(",").filter(Boolean)
    : [];

  const etiquetaMarca =
    marcasSeleccionadas.length === 0
      ? "Todas"
      : marcasSeleccionadas.length === 1
        ? marcasSeleccionadas[0]
        : `${marcasSeleccionadas.length} seleccionadas`;

  const etiquetaCategoria =
    categoriasSeleccionadas.length === 0
      ? "Todas"
      : categoriasSeleccionadas.length === 1
        ? categoriasSeleccionadas[0]
        : `${categoriasSeleccionadas.length} seleccionadas`;

  const etiquetaColor =
    coloresSeleccionados.length === 0
      ? "Todos"
      : coloresSeleccionados.length === 1
        ? coloresSeleccionados[0]
        : `${coloresSeleccionados.length} seleccionados`;

  const opcionesOrden = [
    { value: "recientes", label: "Fecha: reciente a antiguo(a)" },
    { value: "precio_asc", label: "Precio: menor a mayor" },
    { value: "precio_desc", label: "Precio: mayor a menor" },
    { value: "nombre_asc", label: "Nombre: A-Z" },
  ];

  const etiquetaOrden =
    opcionesOrden.find((o) => o.value === filtrosActivos.ordenar_por)?.label ||
    "Fecha: reciente a antiguo(a)";

  const gridClasesProductos = mostrarFiltros
    ? "grid gap-5 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" // con filtros → 3 columnas
    : "grid gap-5 mb-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"; // sin filtros → 4 columnas


  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      {/* más ancho para que parezca sitio real de tienda */}
      <main className="w-full max-w-[1400px] mx-auto px-4 pt-38 md:pt-36 lg:pt-40 pb-10">
        {/* Breadcrumb */}
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-3 flex items-center flex-wrap gap-1">
          {/* Inicio */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="hover:text-[#6b21a8] hover:underline underline-offset-2"
          >
            Inicio
          </button>

          {/* Si hay principal y secundaria: /categorias/ropa-deportiva/mujer */}
          {initialPrincipalSlug && initialSecundariaSlug && (
            <>
              <span className="mx-1">›</span>
              <button
                type="button"
                onClick={() => router.push(`/categorias/${initialPrincipalSlug}`)}
                className="hover:text-[#6b21a8] hover:underline underline-offset-2"
              >
                {prettyFromSlug(initialPrincipalSlug)}
              </button>

              <span className="mx-1">›</span>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/categorias/${initialPrincipalSlug}/${initialSecundariaSlug}`
                  )
                }
                className="text-gray-800 font-medium hover:text-[#6b21a8] hover:underline underline-offset-2"
              >
                {prettyFromSlug(initialSecundariaSlug)}
              </button>
            </>
          )}

          {/* Si solo hay una categoría (ej. /categorias/ropa-deportiva) */}
          {!initialPrincipalSlug && initialCategoriaSlug && (
            <>
              <span className="mx-1">›</span>
              <button
                type="button"
                onClick={() => router.push(`/categorias/${initialCategoriaSlug}`)}
                className="text-gray-800 font-medium hover:text-[#6b21a8] hover:underline underline-offset-2"
              >
                {prettyFromSlug(initialCategoriaSlug)}
              </button>
            </>
          )}

          {/* Fallback: páginas que solo usan titulo (ej. /nuevo) */}
          {!initialPrincipalSlug && !initialCategoriaSlug && titulo && (
            <>
              <span className="mx-1">›</span>
              <span className="text-gray-800 font-medium">{titulo}</span>
            </>
          )}
        </div>


        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#6b21a8]">{titulo}</h1>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-700"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <circle cx="4" cy="12" r="2" />
                <circle cx="12" cy="10" r="2" />
                <circle cx="20" cy="14" r="2" />
              </svg>

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

          {/* Ordenar como dropdown personalizado */}
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span className="hidden sm:inline">Ordenar:</span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenOrden((v) => !v)}
                className="inline-flex items-center gap-1 cursor-pointer text-sm font-medium"
              >
                <span className="underline underline-offset-2">
                  {etiquetaOrden}
                </span>
                <span
                  className={`text-[12px] text-gray-600 transition-transform ${openOrden ? "rotate-180" : ""
                    }`}
                >
                  ▾
                </span>
              </button>

              {openOrden && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 text-xs z-20">
                  {opcionesOrden.map((op) => {
                    const seleccionada =
                      filtrosActivos.ordenar_por === op.value;
                    return (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => {
                          aplicarFiltro("ordenar_por", op.value);
                          setOpenOrden(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#f9f5ff] ${seleccionada
                          ? "text-[#6b21a8] font-semibold"
                          : "text-gray-700"
                          }`}
                      >
                        {op.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === PANTALLA PARTIDA EN DOS COLUMNAS === */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start mt-2">
          {/* Columna izquierda: filtros */}
          {mostrarFiltros && (
            <aside className="col-span-1 lg:col-span-3 text-sm bg-[#fdf6e3] p-1">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-gray-800 text-sm tracking-wide uppercase">
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
                    <div className="border-b border-black pb-3 mb-1">
                      <button
                        type="button"
                        onClick={() => setOpenMarca((v) => !v)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-semibold text-gray-700 uppercase">
                          Marca
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{etiquetaMarca}</span>
                          <span
                            className={`text-[10px] text-gray-400 transition-transform ${openMarca ? "rotate-180" : ""
                              }`}
                          >
                            ▾
                          </span>
                        </div>
                      </button>

                      {openMarca && (
                        <div className="mt-2 space-y-1 text-xs">
                          {/* Opción Todas */}
                          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#f9f5ff] cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 rounded border-gray-300"
                              checked={marcasSeleccionadas.length === 0}
                              onChange={() => aplicarFiltro("marca", "")}
                            />
                            <span
                              className={
                                marcasSeleccionadas.length === 0
                                  ? "text-[#6b21a8] font-semibold"
                                  : ""
                              }
                            >
                              Todas
                            </span>
                          </label>

                          {filtrosDisponibles.marcas.map((marca) => {
                            const seleccionada =
                              marcasSeleccionadas.includes(marca);
                            return (
                              <label
                                key={marca}
                                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#f9f5ff] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="w-3 h-3 rounded border-gray-300"
                                  checked={seleccionada}
                                  onChange={() =>
                                    toggleOpcionMultiple("marca", marca)
                                  }
                                />
                                <span
                                  className={
                                    seleccionada
                                      ? "text-[#6b21a8] font-semibold"
                                      : ""
                                  }
                                >
                                  {marca}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Categoría */}
                  {filtrosDisponibles.categorias.length > 0 && (
                    <div className="border-b border-black pb-3 mb-1">
                      <button
                        type="button"
                        onClick={() => setOpenCategoria((v) => !v)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-semibold text-gray-700 uppercase">
                          Categoría
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{etiquetaCategoria}</span>
                          <span
                            className={`text-[10px] text-gray-400 transition-transform ${openCategoria ? "rotate-180" : ""
                              }`}
                          >
                            ▾
                          </span>
                        </div>
                      </button>

                      {openCategoria && (
                        <div className="mt-2 space-y-1 text-xs">
                          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#f9f5ff] cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 rounded border-gray-300"
                              checked={categoriasSeleccionadas.length === 0}
                              onChange={() =>
                                aplicarFiltro("categoria", "")
                              }
                            />
                            <span
                              className={
                                categoriasSeleccionadas.length === 0
                                  ? "text-[#6b21a8] font-semibold"
                                  : ""
                              }
                            >
                              {initialCategoria ? "Categoría base" : "Todas"}
                            </span>
                          </label>

                          {filtrosDisponibles.categorias.map((cat) => {
                            const seleccionada =
                              categoriasSeleccionadas.includes(cat);
                            return (
                              <label
                                key={cat}
                                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#f9f5ff] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="w-3 h-3 rounded border-gray-300"
                                  checked={seleccionada}
                                  onChange={() =>
                                    toggleOpcionMultiple("categoria", cat)
                                  }
                                />
                                <span
                                  className={
                                    seleccionada
                                      ? "text-[#6b21a8] font-semibold"
                                      : ""
                                  }
                                >
                                  {cat}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Color */}
                  {filtrosDisponibles.colores.length > 0 && (
                    <div className="border-b border-black pb-3 mb-1">
                      <button
                        type="button"
                        onClick={() => setOpenColor((v) => !v)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm font-semibold text-gray-700 uppercase">
                          Color
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{etiquetaColor}</span>
                          <span
                            className={`text-[10px] text-gray-400 transition-transform ${openColor ? "rotate-180" : ""
                              }`}
                          >
                            ▾
                          </span>
                        </div>
                      </button>

                      {openColor && (
                        <div className="mt-2 space-y-1 text-xs">
                          <label className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#f9f5ff] cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-3 h-3 rounded border-gray-300"
                              checked={coloresSeleccionados.length === 0}
                              onChange={() => aplicarFiltro("color", "")}
                            />
                            <span
                              className={
                                coloresSeleccionados.length === 0
                                  ? "text-[#6b21a8] font-semibold"
                                  : ""
                              }
                            >
                              Todos
                            </span>
                          </label>

                          {filtrosDisponibles.colores.map((color) => {
                            const seleccionada =
                              coloresSeleccionados.includes(color);
                            return (
                              <label
                                key={color}
                                className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#f9f5ff] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="w-3 h-3 rounded border-gray-300"
                                  checked={seleccionada}
                                  onChange={() =>
                                    toggleOpcionMultiple("color", color)
                                  }
                                />
                                <span
                                  className={
                                    seleccionada
                                      ? "text-[#6b21a8] font-semibold"
                                      : ""
                                  }
                                >
                                  {color}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Talla */}
                  {filtrosDisponibles.tallas.length > 0 && (
                    <div className="border-b border-black pb-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase mb-1.5">
                        Talla
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {filtrosDisponibles.tallas.map((talla) => (
                          <button
                            key={talla}
                            onClick={() => toggleFiltro("talla", talla)}
                            className={`px-2.5 py-1 rounded-full border text-xs ${filtrosActivos.talla === talla
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
          <div className={mostrarFiltros ? "col-span-1 lg:col-span-9" : "col-span-1 lg:col-span-12"}>
            {loading ? (
              <div className="grid gap-5 mb-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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
                No hay productos que coincidan con estos filtros.
              </div>
            ) : (
              <>
                <div className={gridClasesProductos}>
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
                        className={`w-8 h-8 text-xs rounded-lg ${pagina === i + 1
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
