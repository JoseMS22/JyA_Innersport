// frontend/components/RecommendedFooter.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ProductoRecomendado = {
  id: number;
  nombre: string;
  precio_minimo: number;
  imagen_principal: string | null;
  marca?: string;
  tiene_stock: boolean;
};

function buildMediaUrl(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

export function RecommendedFooter() {
  const router = useRouter();
  const [productos, setProductos] = useState<ProductoRecomendado[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function cargarRecomendados() {
      try {
        const params = new URLSearchParams({
          pagina: "1",
          por_pagina: "4",
          solo_disponibles: "true",
          ordenar_por: "destacados",
        });

        const res = await fetch(
          `${API_BASE_URL}/api/v1/catalogo?${params.toString()}`
        );
        const data = await res.json();

        setProductos(data.productos.slice(0, 4));
      } catch (error) {
        console.error("Error cargando recomendados:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarRecomendados();
  }, []);

  if (loading || productos.length === 0) {
    return null;
  }

  return (
    <footer className="bg-gradient-to-b from-[#fdf6e3] to-[#fef3c7] border-t border-[#e5e7eb]">
      {/* Productos recomendados */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#6b21a8] mb-2">
            También te puede interesar
          </h2>
          <p className="text-sm text-gray-600">
            Descubre más productos seleccionados para ti
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {productos.map((producto) => (
            <button
              key={producto.id}
              onClick={() => router.push(`/productos/${producto.id}`)}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#a855f7] transition-all group"
            >
              {/* Imagen */}
              <div className="relative aspect-square bg-gradient-to-br from-[#111827] via-[#4c1d95] to-[#a855f7] overflow-hidden">
                {producto.imagen_principal ? (
                  <img
                    src={buildMediaUrl(producto.imagen_principal)}
                    alt={producto.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white text-3xl">
                    📦
                  </div>
                )}

                {/* Badge stock */}
                {producto.tiene_stock && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded-full">
                      DISPONIBLE
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                  {producto.marca || "Innersport"}
                </p>
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                  {producto.nombre}
                </p>
                <p className="text-sm font-bold text-[#6b21a8]">
                  ₡{producto.precio_minimo.toLocaleString("es-CR")}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[#a855f7] hover:bg-[#7e22ce] text-white font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
          >
            Ver todo el catálogo
            <span>→</span>
          </button>
        </div>
      </section>

      {/* Info footer */}
      <div className="bg-[#fffdfc] border-t border-[#e5e7eb]">
        <div className="bg-[#fffdfc] max-w-7xl mx-auto px-4 py-12">
          {/* Grid principal */}
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Columna 1: Sobre la empresa */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a855f7] to-[#6b21a8] flex items-center justify-center text-white font-bold text-sm">
                  JYA
                </div>
                <span className="font-bold text-gray-900">Innersport</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Tu tienda de confianza para ropa deportiva y accesorios de alta calidad.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-[#6b21a8]">📍</span>
                  <div>
                    <p className="font-medium text-gray-900">Alajuela Centro</p>
                    <p>Calle 2, Avenida 3</p>
                    <p>Costa Rica</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Enlaces rápidos */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Enlaces Rápidos
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/" className="hover:text-[#6b21a8] transition-colors">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/nuevo" className="hover:text-[#6b21a8] transition-colors">
                    Lo Nuevo
                  </Link>
                </li>
                <li>
                  <Link href="/categorias/ropa-deportiva" className="hover:text-[#6b21a8] transition-colors">
                    Ropa Deportiva
                  </Link>
                </li>
                <li>
                  <Link href="/categorias/calzado" className="hover:text-[#6b21a8] transition-colors">
                    Calzado
                  </Link>
                </li>
                <li>
                  <Link href="/categorias/accesorios" className="hover:text-[#6b21a8] transition-colors">
                    Accesorios
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Ayuda y soporte */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Ayuda y Soporte
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/account/orders" className="hover:text-[#6b21a8] transition-colors">
                    Mis Pedidos
                  </Link>
                </li>
                <li>
                  <Link href="/account/profile" className="hover:text-[#6b21a8] transition-colors">
                    Mi Cuenta
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-[#6b21a8] transition-colors">
                    Carrito de Compras
                  </Link>
                </li>
                <li>
                  <Link href="/favorites" className="hover:text-[#6b21a8] transition-colors">
                    Favoritos
                  </Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/50612345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#6b21a8] transition-colors inline-flex items-center gap-1"
                  >
                    <span>📱</span> WhatsApp
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 4: Contacto y Redes */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Contacto
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>
                  <a
                    href="tel:+50640003000"
                    className="hover:text-[#6b21a8] transition-colors inline-flex items-center gap-2"
                  >
                    <span>📞</span> +506 4000-3000
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:info@jyainnersport.com"
                    className="hover:text-[#6b21a8] transition-colors inline-flex items-center gap-2"
                  >
                    <span>✉️</span> info@jyainnersport.com
                  </a>
                </li>
                <li className="text-gray-600">
                  <span className="font-medium text-gray-900">Horario:</span> Lun - Sáb
                </li>
                <li className="text-gray-600">
                  9:00 AM - 6:00 PM
                </li>
              </ul>

              {/* Redes sociales */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Síguenos
                </h4>
                <div className="flex gap-2">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#6b21a8] hover:bg-[#a855f7] hover:text-white transition-all"
                    aria-label="Facebook"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 5.02 3.66 9.19 8.44 9.93v-7.03H8.08v-2.9h2.36V9.96c0-2.33 1.39-3.62 3.52-3.62 1.02 0 2.09.18 2.09.18v2.29h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18v7.03c4.78-.74 8.44-4.91 8.44-9.93z" />
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#6b21a8] hover:bg-[#a855f7] hover:text-white transition-all"
                    aria-label="Instagram"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.65 0 3 1.35 3 3v10c0 1.65-1.35 3-3 3H7c-1.65 0-3-1.35-3-3V7c0-1.65 1.35-3 3-3h10zm-5 3.3A4.7 4.7 0 1016.7 12 4.7 4.7 0 0012 7.3zm0 7.7A3 3 0 1115 12a3 3 0 01-3 3zm4.75-8.75a1.15 1.15 0 11-1.15-1.15 1.15 1.15 0 011.15 1.15z" />
                    </svg>
                  </a>
                  <a
                    href="https://wa.me/50612345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#6b21a8] hover:bg-[#a855f7] hover:text-white transition-all"
                    aria-label="WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Sección de métodos de pago */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">Métodos de pago aceptados</p>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-white rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    VISA
                  </div>
                  <div className="px-3 py-1.5 bg-white rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    MC
                  </div>
                  <div className="px-3 py-1.5 bg-white rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    SINPE
                  </div>
                  <div className="px-3 py-1.5 bg-white rounded border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    💳
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Envíos seguros</p>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-white rounded border border-gray-200 text-xs text-gray-700">
                    🚚 Correos CR
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright y legal */}
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>
              © {currentYear} JYA Innersport. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-[#6b21a8] transition-colors">
                Términos y Condiciones
              </Link>
              <Link href="/privacy" className="hover:text-[#6b21a8] transition-colors">
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}