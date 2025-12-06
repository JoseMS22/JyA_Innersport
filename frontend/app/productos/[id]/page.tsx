// frontend/app/productos/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { ImageZoomModal } from "@/components/ImageZoomModal";
import { useCart } from "../../context/cartContext";
import { useFavorites } from "../../context/favoritesContext";
import { RecommendedFooter } from "@/components/RecommendedFooter";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildMediaUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

type Variante = {
  id: number;
  sku: string;
  barcode: string | null;
  marca: string | null;
  color: string | null;
  talla: string | null;
  precio_actual: number;
  activo: boolean;
};

type Inventario = {
  sucursal_id: number;
  sucursal_nombre: string;
  cantidad: number;
};

type Media = {
  id: number;
  url: string;
  tipo: string;
  orden: number;
};

type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
};

type ProductoDetalle = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  categorias: Categoria[];
  media: Media[];
  variantes: Variante[];
};

type InventarioDisponibilidad = {
  variante_id: number;
  inventarios: Inventario[];
  total_stock: number;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type AuthAlertState = {
  message: string;
} | null;

// 🎨 Mapa de colores para hexadecimales
const COLOR_HEX_MAP: Record<string, string> = {
  // Básicos
  Negro: "#000000",
  Blanco: "#FFFFFF",
  Gris: "#808080",
  Azul: "#0066CC",
  Rojo: "#FF0000",
  Verde: "#00AA00",
  Amarillo: "#FFD700",
  Rosa: "#FF69B4",
  Morado: "#9933FF",
  Púrpura: "#9933FF",
  Naranja: "#FF8C00",

  // Variaciones
  "Azul marino": "#000080",
  "Azul cielo": "#87CEEB",
  "Verde oliva": "#808000",
  "Verde menta": "#98FF98",
  "Rojo oscuro": "#8B0000",
  "Rosa claro": "#FFB6C1",
  "Gris oscuro": "#404040",
  "Gris claro": "#D3D3D3",
  Beige: "#F5F5DC",
  Café: "#8B4513",
  Crema: "#FFFDD0",
  Turquesa: "#40E0D0",
  Coral: "#FF7F50",
  Lavanda: "#E6E6FA",
};

function getColorHex(colorName: string | null): string {
  if (!colorName) return "#E5E7EB";

  const normalized = colorName.trim();
  return COLOR_HEX_MAP[normalized] || "#E5E7EB";
}

export default function ProductDetailPage() {
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const router = useRouter();
  const params = useParams();
  const productoId = params.id as string;

  // Estados de la página
  const [authAlert, setAuthAlert] = useState<AuthAlertState>(null);
  const [loading, setLoading] = useState(true);
  const [producto, setProducto] = useState<ProductoDetalle | null>(null);
  const [inventarios, setInventarios] =
    useState<Record<number, InventarioDisponibilidad>>({});
  // Estado de autenticación
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  const [selectedVariante, setSelectedVariante] = useState<Variante | null>(
    null
  );
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedTalla, setSelectedTalla] = useState<string>("");
  const [selectedMarca, setSelectedMarca] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cantidad, setCantidad] = useState(1);

  // 🆕 Estado para el carrusel hover
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [carouselInterval, setCarouselInterval] =
    useState<NodeJS.Timeout | null>(null);

  const [showZoom, setShowZoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ Verificar sesión
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
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

  // Cargar producto
  useEffect(() => {
    async function cargarProducto() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const resProducto = await fetch(
          `${API_BASE}/api/v1/productos/${productoId}`
        );

        if (!resProducto.ok) {
          throw new Error("Producto no encontrado");
        }

        const dataProducto: ProductoDetalle = await resProducto.json();

        const resVariantes = await fetch(
          `${API_BASE}/api/v1/variantes/productos/${productoId}/variantes?solo_activas=true`
        );

        if (!resVariantes.ok) {
          throw new Error("Error cargando variantes");
        }

        const variantes: Variante[] = await resVariantes.json();

        const productoCompleto = {
          ...dataProducto,
          variantes,
        };

        setProducto(productoCompleto);

        const variantesActivas = variantes.filter((v) => v.activo);
        const inventariosPromises = variantesActivas.map(async (variante) => {
          const invRes = await fetch(
            `${API_BASE}/api/v1/public/inventario?variante_id=${variante.id}`
          );

          let invData: any[] = [];

          if (invRes.ok) {
            const raw = await invRes.json();
            invData = Array.isArray(raw) ? raw : [];
          }

          return {
            variante_id: variante.id,
            inventarios: invData.map((inv: any) => ({
              sucursal_id: inv.sucursal_id,
              sucursal_nombre: inv.sucursal_nombre || "Sucursal",
              cantidad: inv.cantidad,
            })),
            total_stock: invData.reduce(
              (sum: number, inv: any) => sum + (inv.cantidad || 0),
              0
            ),
          };
        });

        const inventariosData = await Promise.all(inventariosPromises);
        const inventariosMap = inventariosData.reduce((acc, inv) => {
          acc[inv.variante_id] = inv;
          return acc;
        }, {} as Record<number, InventarioDisponibilidad>);

        setInventarios(inventariosMap);

        const primeraConStock = variantesActivas.find(
          (v) => inventariosMap[v.id]?.total_stock > 0
        );

        if (primeraConStock) {
          setSelectedVariante(primeraConStock);
          setSelectedColor(primeraConStock.color || "");
          setSelectedTalla(primeraConStock.talla || "");
          setSelectedMarca(primeraConStock.marca || "");
        } else if (variantesActivas.length > 0) {
          const primera = variantesActivas[0];
          setSelectedVariante(primera);
          setSelectedColor(primera.color || "");
          setSelectedTalla(primera.talla || "");
          setSelectedMarca(primera.marca || "");
        }
      } catch (error: any) {
        console.error("Error cargando producto:", error);
        setErrorMsg(error.message || "Error cargando el producto");
      } finally {
        setLoading(false);
      }
    }

    if (productoId) {
      cargarProducto();
    }
  }, [productoId]);

  useEffect(() => {
    if (!producto) return;

    const varianteCandidato = producto.variantes.find(
      (v) =>
        v.activo &&
        (!selectedColor || v.color === selectedColor) &&
        (!selectedTalla || v.talla === selectedTalla) &&
        (!selectedMarca || v.marca === selectedMarca)
    );

    setSelectedVariante(varianteCandidato || null);
  }, [selectedColor, selectedTalla, selectedMarca, producto]);

  // 🆕 Lógica del carrusel automático
  useEffect(() => {
    if (!isHoveringImage || !imagenes || imagenes.length <= 1) {
      if (carouselInterval) {
        clearInterval(carouselInterval);
        setCarouselInterval(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setSelectedImageIndex((prev) => {
        const next = prev + 1;
        return next >= imagenes.length ? 0 : next;
      });
    }, 800);

    setCarouselInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHoveringImage]);

  const coloresDisponibles = Array.from(
    new Set(
      producto?.variantes
        .filter((v) => v.activo)
        .map((v) => v.color)
        .filter(Boolean)
    )
  ) as string[];

  const tallasDisponibles = Array.from(
    new Set(
      producto?.variantes
        .filter((v) => v.activo)
        .map((v) => v.talla)
        .filter(Boolean)
    )
  ) as string[];

  const marcasDisponibles = Array.from(
    new Set(
      producto?.variantes
        .filter((v) => v.activo)
        .map((v) => v.marca)
        .filter(Boolean)
    )
  ) as string[];

  function formatoPrecio(precio: number) {
    return `₡${precio.toLocaleString("es-CR")}`;
  }

  function handleToggleFavorite() {
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

    if (!producto || !selectedVariante) {
      setAuthAlert({
        message: "Selecciona color y talla antes de guardar en favoritos.",
      });
      return;
    }

    const yaEraFavorito = isFavorite(selectedVariante.id);

    const favItem = {
      id: selectedVariante.id,
      productoId: producto.id,
      name: producto.nombre,
      brand: selectedVariante.marca || undefined,
      price: selectedVariante.precio_actual,
      imagenUrl: null,
      color: selectedVariante.color ?? (selectedColor || null),
      talla: selectedVariante.talla ?? (selectedTalla || null),
    };

    toggleFavorite(favItem);

    setAuthAlert({
      message: yaEraFavorito
        ? "El producto se quitó de favoritos."
        : "Producto guardado en favoritos.",
    });
  }

  const isCurrentFavorite =
    selectedVariante ? isFavorite(selectedVariante.id) : false;

  function handleAddToCart() {
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
    if (!selectedVariante || !producto) {
      setAuthAlert({
        message: "Por favor selecciona una variante válida.",
      });
      return;
    }

    const stockDisponible =
      inventarios[selectedVariante.id]?.total_stock || 0;

    if (stockDisponible === 0) {
      setAuthAlert({
        message: "Esta variante no tiene stock disponible.",
      });
      return;
    }

    if (cantidad > stockDisponible) {
      setAuthAlert({
        message: `Solo hay ${stockDisponible} unidades disponibles.`,
      });
      return;
    }

    // Construimos los objetos mínimos que espera el contexto
    const varianteForCart = {
      id: selectedVariante.id,
      sku: selectedVariante.sku,
      color: selectedVariante.color,
      talla: selectedVariante.talla,
      precio_actual: selectedVariante.precio_actual,
    };

    const productoForCart = producto
      ? {
          id: producto.id,
          nombre: producto.nombre,
          brand: selectedVariante.marca || undefined,
        }
      : null;

    const imagenes = [...producto.media].sort((a, b) => a.orden - b.orden);
    const imagenActual = imagenes[selectedImageIndex] || imagenes[0];

    const imagenUrl = imagenActual ? buildMediaUrl(imagenActual.url) : null;

    // El contexto se encarga de llamar al backend o usar localStorage
    addItem(
      varianteForCart as any,
      productoForCart as any,
      cantidad,
      imagenUrl
    );

    // ✅ Mensaje moderno en vez de alert()
    setToast({
      type: "success",
      message: `Agregado al carrito: ${cantidad} x ${producto.nombre} (${selectedVariante.sku})`,
    });

    setAuthAlert({
      message: "El producto se añadió al carrito.",
    });
  }

  function incrementCantidad() {
    const stockDisponible = selectedVariante
      ? inventarios[selectedVariante.id]?.total_stock || 0
      : 0;

    if (cantidad < stockDisponible) {
      setCantidad(cantidad + 1);
    }
  }

  function decrementCantidad() {
    if (cantidad > 1) {
      setCantidad(cantidad - 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-6xl mx-auto px-4 py-8 pt-37">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (errorMsg || !producto) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-6xl mx-auto px-4 py-8 pt-37">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Producto no encontrado
            </h1>
            <p className="text-gray-600 mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-[#a855f7] hover:bg-[#7e22ce] text-white rounded-lg font-medium"
            >
              Volver al catálogo
            </button>
          </div>
        </main>
      </div>
    );
  }

  const imagenes = [...producto.media].sort((a, b) => a.orden - b.orden);
  const imagenActual = imagenes[selectedImageIndex] || imagenes[0];
  const stockTotal = selectedVariante
    ? inventarios[selectedVariante.id]?.total_stock || 0
    : 0;
  const hayStock = stockTotal > 0;

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-6xl mx-auto px-4 py-6 pt-38">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-6">
          <button
            onClick={() => router.push("/")}
            className="hover:text-[#6b21a8]"
          >
            Inicio
          </button>
          <span className="mx-2">›</span>
          {producto.categorias.length > 0 && (
            <>
              <button
                onClick={() =>
                  router.push(
                    `/?categoria=${producto.categorias[0].nombre}`
                  )
                }
                className="hover:text-[#6b21a8]"
              >
                {producto.categorias[0].nombre}
              </button>
              <span className="mx-2">›</span>
            </>
          )}
          <span className="text-gray-800 font-medium">
            {producto.nombre}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* 🆕 Galería con carrusel mejorado */}
          <div className="space-y-4">
            {/* Imagen principal con carrusel hover */}
            <div
              className="relative aspect-square bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] rounded-2xl overflow-hidden cursor-zoom-in"
              onMouseEnter={() => setIsHoveringImage(true)}
              onMouseLeave={() => {
                setIsHoveringImage(false);
                setSelectedImageIndex(0);
              }}
              onClick={() => setShowZoom(!showZoom)}
            >
              {imagenActual ? (
                <img
                  src={buildMediaUrl(imagenActual.url)}
                  alt={producto.nombre}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-4xl">
                  📦
                </div>
              )}

              {/* Badge de stock */}
              <div className="absolute top-4 left-4">
                {hayStock ? (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    DISPONIBLE
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                    AGOTADO
                  </span>
                )}
              </div>

              {/* 🆕 Indicador de carrusel */}
              {isHoveringImage && imagenes.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imagenes.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        index === selectedImageIndex
                          ? "w-6 bg-white"
                          : "w-1 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Miniaturas */}
            {imagenes.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {imagenes.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(index)}
                    onMouseEnter={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      index === selectedImageIndex
                        ? "border-[#a855f7] scale-105"
                        : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={buildMediaUrl(img.url)}
                      alt={`${producto.nombre} - vista ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            {/* Título y precio */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {producto.nombre}
              </h1>

              {producto.categorias.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {producto.categorias.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2 py-1 bg-[#fef3c7] text-[#854d0e] text-xs rounded-full font-medium"
                    >
                      {cat.nombre}
                    </span>
                  ))}
                </div>
              )}

              {selectedVariante ? (
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[#6b21a8]">
                    {formatoPrecio(selectedVariante.precio_actual)}
                  </span>
                  <span className="text-sm text-gray-500">
                    SKU: {selectedVariante.sku}
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  Selecciona una variante
                </span>
              )}
            </div>

            {/* Descripción */}
            {producto.descripcion && (
              <div className="p-4 bg.white/70 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {producto.descripcion}
                </p>
              </div>
            )}

            {/* Selector de Marca */}
            {marcasDisponibles.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Marca
                </label>
                <div className="flex flex-wrap gap-2">
                  {marcasDisponibles.map((marca) => (
                    <button
                      key={marca}
                      onClick={() => setSelectedMarca(marca)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedMarca === marca
                          ? "border-[#a855f7] bg-[#a855f7] text-white"
                          : "border-gray-200 hover:border-[#a855f7]"
                      }`}
                    >
                      {marca}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 🎨 Selector de Color con cuadritos */}
            {coloresDisponibles.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color {selectedColor && `- ${selectedColor}`}
                </label>
                <div className="flex flex-wrap gap-3">
                  {coloresDisponibles.map((color) => {
                    const hexColor = getColorHex(color);
                    const isWhite = hexColor === "#FFFFFF";

                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`group relative w-10 h-10 rounded-lg transition-all ${
                          selectedColor === color
                            ? "ring-2 ring-[#a855f7] ring-offset-2 scale-110"
                            : "hover:scale-105"
                        }`}
                        title={color}
                      >
                        <div
                          className={`w-full h-full rounded-lg ${
                            isWhite ? "border-2 border-gray-300" : ""
                          }`}
                          style={{ backgroundColor: hexColor }}
                        />

                        {/* Checkmark cuando está seleccionado */}
                        {selectedColor === color && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className={`w-5 h-5 ${
                                isWhite ? "text-gray-800" : "text-white"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Tooltip */}
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {color}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selector de Talla */}
            {tallasDisponibles.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Talla
                </label>
                <div className="flex flex-wrap gap-2">
                  {tallasDisponibles.map((talla) => (
                    <button
                      key={talla}
                      onClick={() => setSelectedTalla(talla)}
                      className={`w-12 h-12 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedTalla === talla
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

            {/* Disponibilidad por sucursal */}
            {selectedVariante && inventarios[selectedVariante.id] && (
              <div className="p-4 bg-white/70 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📍</span> Disponibilidad por sucursal
                </h3>
                <div className="space-y-2">
                  {inventarios[
                    selectedVariante.id
                  ].inventarios.map((inv) => (
                    <div
                      key={inv.sucursal_id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-gray-700">
                        {inv.sucursal_nombre}
                      </span>
                      <span
                        className={`font-semibold ${
                          inv.cantidad > 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {inv.cantidad > 0
                          ? `${inv.cantidad} disponibles`
                          : "Agotado"}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-gray-700 font-semibold">
                      Total
                    </span>
                    <span className="font-bold text-[#6b21a8]">
                      {stockTotal} unidades
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cantidad y botón de compra */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cantidad
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={decrementCantidad}
                    disabled={cantidad <= 1}
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-[#a855f7] disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-lg font-semibold">
                    {cantidad}
                  </span>
                  <button
                    onClick={incrementCantidad}
                    disabled={!selectedVariante || cantidad >= stockTotal}
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-[#a855f7] disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    +
                  </button>
                  {selectedVariante && (
                    <span className="text-xs text-gray-500 ml-2">
                      Máximo: {stockTotal} disponibles
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!selectedVariante || !hayStock}
                className="w-full py-3 bg-[#a855f7] hover:bg-[#7e22ce] text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
              >
                {!selectedVariante ? (
                  "Selecciona una variante"
                ) : !hayStock ? (
                  "Producto agotado"
                ) : (
                  <>🛒 Agregar al carrito</>
                )}
              </button>

              {/* Botón favoritos */}
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={!selectedVariante}
                className="mt-2 w-full py-2 border rounded-lg text-xs font-medium flex items-center justify-center gap-2 text-[#6b21a8] hover:bg-[#f5e9ff] disabled:opacity-50"
              >
                <span>
                  {selectedVariante && isFavorite(selectedVariante.id)
                    ? "♥"
                    : "♡"}
                </span>
                <span>
                  {selectedVariante && isFavorite(selectedVariante.id)
                    ? "Quitar de favoritos"
                    : "Guardar en favoritos"}
                </span>
              </button>

              {/* Información adicional */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <span>✓</span>
                  <span>Envío gratis desde ₡50.000</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>↩</span>
                  <span>Devolución en 30 días</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 🆕 Footer con productos recomendados */}
      <RecommendedFooter />

      {imagenActual && (
        <ImageZoomModal
          imageUrl={buildMediaUrl(imagenActual.url)}
          productName={producto.nombre}
          isOpen={showZoom}
          onClose={() => setShowZoom(false)}
        />
      )}

      {/* Toast moderno */}
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
            </div>
          </div>
        </div>
      )}

      {/* Modal de atención (authAlert) */}
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
    </div>
  );
}
