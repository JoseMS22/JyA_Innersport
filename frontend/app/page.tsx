// #frontend/app/page.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainMenu } from "../components/MainMenu";
import { SearchBar } from "../components/SearchBar";
import { useFavorites } from "./context/favoritesContext";

// ======================
// Tipos del catálogo real (API)
// ======================
type Producto = {
  id: number;
  nombre: string;
  precio_minimo: number;

  // antes solo tenías esto:
  imagen_principal: string | null;

  // 🔹 añadimos campos opcionales:
  marca?: string;
  imagenes?: string[]; // array de URLs adicionales (si tu API las manda)

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

type HomeHeroConfig = {
  video_url: string | null;
  banner1_url: string | null;
  banner2_url: string | null;
};

// ======================
// API BASE + Helper imágenes
// ======================
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildMediaUrl(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

// Toast
type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

// Alert de auth
type AuthAlertState = {
  message: string;
} | null;

type ProductoNuevoCardProps = {
  producto: Producto;
  onAddToCart: (producto: Producto) => void;
  onOpen: () => void;
};

function formatoPrecio(precio: number) {
  return `₡${precio.toLocaleString("es-CR")}`;
}

function ProductoNuevoCard({
  producto,
  onAddToCart,
  onOpen,
}: ProductoNuevoCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Construimos todas las imágenes disponibles
  const imagenes: string[] = [];

  if (producto.imagen_principal) {
    imagenes.push(buildMediaUrl(producto.imagen_principal));
  }

  if (producto.imagenes && producto.imagenes.length > 0) {
    for (const img of producto.imagenes) {
      const url = buildMediaUrl(img);
      if (!imagenes.includes(url)) {
        imagenes.push(url);
      }
    }
  }

  const tieneVariasImagenes = imagenes.length > 1;

  function startCarousel() {
    if (!tieneVariasImagenes) return;
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        return next >= imagenes.length ? 0 : next;
      });
    }, 1500);
  }

  function stopCarousel() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentIndex(0);
  }

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <article
      onClick={onOpen}
      className="min-w-[240px] max-w-[300px] md:min-w-[260px] md:max-w-[320px] bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition cursor-pointer group"
    >
      {/* 🔹 IMAGEN MÁS ALTA + CARRUSEL */}
      <div
        className="relative h-64 bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] overflow-hidden"
        onMouseEnter={startCarousel}
        onMouseLeave={stopCarousel}
      >
        {imagenes.length > 0 ? (
          <div className="relative w-full h-full">
            {imagenes.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={producto.nombre}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${index === currentIndex ? "opacity-100" : "opacity-0"
                  } ${!tieneVariasImagenes ? "group-hover:scale-105 transition-transform duration-300" : ""}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            📦
          </div>
        )}

        {/* Badges de stock */}
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

      </div>

      {/* 🔹 TEXTO: marca + nombre + precio */}
      <div className="p-4 text-[13px]">
        <p className="text-gray-500 text-[11px] uppercase tracking-wide">
          {producto.marca || "Innersport"}
        </p>
        <p className="mt-1 line-clamp-2 text-gray-900 text-sm">
          {producto.nombre}
        </p>
        <p className="mt-2 font-semibold text-[15px] text-[#6b21a8]">
          {formatoPrecio(producto.precio_minimo)}
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(producto);
          }}
          disabled={!producto.tiene_stock}
          className="mt-3 w-full text-center text-[11px] font-semibold rounded-lg py-1.5 border border-[#a855f7] text-[#6b21a8] hover:bg-[#f5e9ff] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {producto.tiene_stock ? "Agregar al carrito" : "Producto agotado"}
        </button>
      </div>
    </article>
  );
}


export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleFavorite, isFavorite } = useFavorites();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [authAlert, setAuthAlert] = useState<AuthAlertState>(null);

  // Estados catálogo principal
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

  // ======================
  // ESTADO PARA "LO NUEVO"
  // ======================
  const [nuevosProductos, setNuevosProductos] = useState<Producto[]>([]);
  const [loadingNuevos, setLoadingNuevos] = useState(true);
  const nuevosRef = useRef<HTMLDivElement | null>(null);

  // Hero
  const [heroConfig, setHeroConfig] = useState<HomeHeroConfig | null>(null);
  const [loadingHero, setLoadingHero] = useState(true);

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

  // Cargar productos desde API (catálogo principal)
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

  // Cargar productos "Lo nuevo"
  useEffect(() => {
    async function cargarNuevos() {
      try {
        setLoadingNuevos(true);
        const params = new URLSearchParams();
        params.set("pagina", "1");
        params.set("por_pagina", "8");
        params.set("solo_disponibles", "true");
        params.set("ordenar_por", "destacados");

        const res = await fetch(
          `${API_BASE_URL}/api/v1/catalogo?${params.toString()}`
        );
        const data: CatalogoResponse = await res.json();
        setNuevosProductos(data.productos);
      } catch (error) {
        console.error("Error cargando productos nuevos:", error);
      } finally {
        setLoadingNuevos(false);
      }
    }

    cargarNuevos();
  }, []);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });

      if (!res.ok) {
        setIsLoggedIn(false);
        return;
      }

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

  // Cargar configuración de portada (pública)
  useEffect(() => {
    async function loadHero() {
      try {
        setLoadingHero(true);
        const res = await fetch(`${API_BASE_URL}/api/v1/home-hero/public`);
        if (!res.ok) {
          setHeroConfig(null);
          return;
        }
        const data = (await res.json()) as HomeHeroConfig;
        setHeroConfig(data);
      } catch (error) {
        console.error("Error cargando portada:", error);
        setHeroConfig(null);
      } finally {
        setLoadingHero(false);
      }
    }

    loadHero();
  }, []);

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

  // Construimos una variante mínima para el carrito
  const variante = {
    id: producto.id,
    sku: "CATALOGO",
    color: null,
    talla: null,
    precio_actual: producto.precio_minimo,
  };

  const productoInfo = {
    id: producto.id,
    nombre: producto.nombre,
  };

  const imagenUrl = buildMediaUrl(producto.imagen_principal);

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
    brand: producto.marca || "Innersport",
    price: producto.precio_minimo,
    imagenUrl: buildMediaUrl(producto.imagen_principal),
  };

  setAuthAlert({
    message: alreadyFav
      ? "El producto se quitó de favoritos."
      : "Producto guardado en favoritos.",
  });
}

  const hayFiltrosActivos = Object.entries(filtrosActivos).some(
    ([key, value]) => value && key !== "ordenar_por"
  );

  // Carrusel "Lo nuevo"
  function scrollNuevos(direction: "left" | "right") {
    const el = nuevosRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      {/* ===================== */}
      {/* HERO VIDEO SUPERIOR   */}
      {/* ===================== */}

      {/* ===================== */}
      {/* HERO VIDEO SUPERIOR   */}
      {/* ===================== */}

      <section className="relative w-full pt-[130px]">
        {/* contenedor del hero tipo Ray-Ban */}
        <div
          className="
      relative w-full 
      h-[60vh] md:h-[80vh] lg:h-[90vh]  /* alto según viewport */
      min-h-[480px]                     /* nunca menos de 480px */
      max-h-[900px]                     /* por si la pantalla es muuuy alta */
      overflow-hidden
      bg-black                          /* color de fondo detrás del video */
    "
        >
          {heroConfig && heroConfig.video_url ? (
            <video
              src={buildMediaUrl(heroConfig.video_url)}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="
          absolute inset-0
          w-full h-full
          object-cover       /* 👈 clave: siempre cubrir, nada de contain */
        "
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-gray-300 opacity-70">
                Configura el video de portada en el panel de administración.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ===================== */}
      {/* DOS IMÁGENES VERTICALES */}
      {/* ===================== */}

      <section className="w-full py-6">
        <div className="grid md:grid-cols-2 gap-2">
          <div className="w-full aspect-[4/5] bg-gray-200 overflow-hidden flex items-center justify-center">
            {heroConfig && heroConfig.banner1_url ? (
              <img
                src={buildMediaUrl(heroConfig.banner1_url)}
                alt="Banner colección 1"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] text-gray-500 p-4 text-center">
                Configura el banner 1 en el panel de administración.
              </span>
            )}
          </div>

          <div className="w-full aspect-[4/5] bg-gray-200 overflow-hidden flex items-center justify-center">
            {heroConfig && heroConfig.banner2_url ? (
              <img
                src={buildMediaUrl(heroConfig.banner2_url)}
                alt="Banner colección 2"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] text-gray-500 p-4 text-center">
                Configura el banner 2 en el panel de administración.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* ===================== */}
        {/* SECCIÓN "LO NUEVO"    */}
        {/* ===================== */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide text-gray-900 uppercase">
                Lo nuevo
              </h2>
              <p className="text-xs text-gray-500">
                Las últimas prendas y accesorios que acaban de llegar a
                Innersport.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollNuevos("left")}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-sm hover:border-[#a855f7]"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollNuevos("right")}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-sm hover:border-[#a855f7]"
              >
                →
              </button>
            </div>
          </div>

          <div className="relative">
            <div
              ref={nuevosRef}
              className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>

              {loadingNuevos ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[220px] max-w-[260px] bg-white rounded-2xl border animate-pulse"
                  >
                    <div className="h-40 bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : nuevosProductos.length === 0 ? (
                <div className="text-xs text-gray-500 py-6">
                  No hay productos nuevos por el momento.
                </div>
              ) : (
                nuevosProductos.map((producto) => (
                  <ProductoNuevoCard
                    key={producto.id}
                    producto={producto}
                    onAddToCart={handleAddToCart}
                    onOpen={() => router.push(`/productos/${producto.id}`)}
                  />
                ))
              )
              }

            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <span className="text-[11px] text-gray-500">
              Desliza para ver más productos.
            </span>
            <button
              type="button"
              onClick={() => router.push("/nuevo")}
              className="text-xs font-semibold text-[#6b21a8] hover:text-[#a855f7] underline underline-offset-2"
            >
              Ver todo lo nuevo
            </button>
          </div>
        </section>
      </main>

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
