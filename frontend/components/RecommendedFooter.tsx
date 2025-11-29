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
      <div className="border-t border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {/* Columna 1 */}
            <div>
              <h3 className="text-sm font-bold text-[#6b21a8] mb-3">
                Sobre nosotros
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li>
                  <Link href="/about" className="hover:text-[#6b21a8]">
                    Quiénes somos
                  </Link>
                </li>
                <li>
                  <Link href="/stores" className="hover:text-[#6b21a8]">
                    Nuestras tiendas
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-[#6b21a8]">
                    Trabaja con nosotros
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 2 */}
            <div>
              <h3 className="text-sm font-bold text-[#6b21a8] mb-3">
                Ayuda
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li>
                  <Link href="/help" className="hover:text-[#6b21a8]">
                    Centro de ayuda
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="hover:text-[#6b21a8]">
                    Envíos
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="hover:text-[#6b21a8]">
                    Devoluciones
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#6b21a8]">
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3 */}
            <div>
              <h3 className="text-sm font-bold text-[#6b21a8] mb-3">
                Legal
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li>
                  <Link href="/terms" className="hover:text-[#6b21a8]">
                    Términos y condiciones
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#6b21a8]">
                    Política de privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-[#6b21a8]">
                    Política de cookies
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 4 - Redes sociales */}
            <div>
              <h3 className="text-sm font-bold text-[#6b21a8] mb-3">
                Síguenos
              </h3>
              <div className="flex gap-3">
                <Link
                  href="https://facebook.com"
                  target="_blank"
                  className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#6b21a8] hover:bg-[#a855f7] hover:text-white transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 5.02 3.66 9.19 8.44 9.93v-7.03H8.08v-2.9h2.36V9.96c0-2.33 1.39-3.62 3.52-3.62 1.02 0 2.09.18 2.09.18v2.29h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18v7.03c4.78-.74 8.44-4.91 8.44-9.93z" />
                  </svg>
                </Link>
                <Link
                  href="https://instagram.com"
                  target="_blank"
                  className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#6b21a8] hover:bg-[#a855f7] hover:text-white transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.65 0 3 1.35 3 3v10c0 1.65-1.35 3-3 3H7c-1.65 0-3-1.35-3-3V7c0-1.65 1.35-3 3-3h10zm-5 3.3A4.7 4.7 0 1016.7 12 4.7 4.7 0 0012 7.3zm0 7.7A3 3 0 1115 12a3 3 0 01-3 3zm4.75-8.75a1.15 1.15 0 11-1.15-1.15 1.15 1.15 0 011.15 1.15z" />
                  </svg>
                </Link>
                <Link
                  href="https://tiktok.com"
                  target="_blank"
                  className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#6b21a8] hover:bg-[#a855f7] hover:text-white transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12.5 2h3.1c.1 1.4.6 2.6 1.6 3.6s2.2 1.5 3.6 1.6v3.1c-1.6 0-3-.4-4.3-1.3v7c0 2-1 3.9-2.7 5-1.7 1.2-3.9 1.3-5.7.6-1.8-.7-3.1-2.2-3.6-4-.5-1.8-.1-3.8 1-5.2 1.2-1.4 3-2.2 4.9-2.1v3.2c-.8-.1-1.7.2-2.3.8-.6.6-.9 1.5-.7 2.3.2.8.8 1.5 1.6 1.8s1.7.1 2.4-.4c.7-.5 1.1-1.3 1.1-2.1V2z" />
                  </svg>
                </Link>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-600 mb-2">
                  Métodos de pago
                </p>
                <div className="flex gap-2">
                  <div className="w-10 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                    VISA
                  </div>
                  <div className="w-10 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                    MC
                  </div>
                  <div className="w-10 h-6 bg-white rounded border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                    SINPE
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-[#e5e7eb] pt-6 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} JYA Innersport. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}