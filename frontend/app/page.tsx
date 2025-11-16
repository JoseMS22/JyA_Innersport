// frontend/app/page.tsx
"use client";

import { MainMenu } from "../components/MainMenu";

type Product = {
  id: number;
  brand: string;
  name: string;
  price: string;
  tag?: string;
  badge?: string;
};

const PRODUCTS: Product[] = [
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Migas de pan */}
        <div className="text-xs text-gray-500 mb-4">
          Inicio <span className="mx-1">›</span>{" "}
          <span className="text-gray-800 font-medium">
            Colección Innersport
          </span>
        </div>

        {/* Hero tipo banner: dos columnas */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Columna izquierda */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f97316] via-[#facc15] to-[#fef3c7] min-h-[260px] flex items-end p-6">
            <div>
              <p className="uppercase text-xs font-semibold tracking-[0.2em] text-white/90">
                NUEVA TEMPORADA
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-extrabold text-white drop-shadow">
                Colección Innersport
              </h1>
              <p className="mt-3 text-sm text-white/90 max-w-md">
                Ropa deportiva pensada para entrenamiento, running y
                estilo urbano. Diseñada para acompañarte dentro y fuera
                de la pista.
              </p>
              <button className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-white/95 text-[#6b21a8] text-xs font-semibold shadow hover:bg-white">
                Ver colección
              </button>
            </div>
          </div>

          {/* Columna derecha (modelo / imagen conceptual) */}
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
                Ideal para entrenar sin perder estilo.
              </p>
            </div>
          </div>
        </section>

        {/* Filtros + listado de productos */}
        <section className="grid md:grid-cols-[260px,1fr] gap-6">
          {/* Filtros laterales (dummy) */}
          <aside className="bg-white/90 rounded-2xl border border-[#e5e7eb] p-4 text-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-800">Filtrar</span>
              <button className="text-xs text-[#6b21a8] hover:text-[#a855f7]">
                Limpiar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase">
                  Categoría
                </h3>
                <div className="mt-2 space-y-1">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" className="rounded border-gray-300" />
                    Running
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" className="rounded border-gray-300" />
                    Entrenamiento
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" className="rounded border-gray-300" />
                    Casual
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase">
                  Talla
                </h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {["XS", "S", "M", "L", "XL"].map((t) => (
                    <button
                      key={t}
                      className="px-2 py-1 rounded-full border border-gray-200 hover:border-[#a855f7]"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase">
                  Precio
                </h3>
                <div className="mt-2 text-xs text-gray-700 space-y-1">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="precio" className="accent-[#a855f7]" />
                    Hasta ₡20.000
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="precio" className="accent-[#a855f7]" />
                    ₡20.000 - ₡35.000
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="precio" className="accent-[#a855f7]" />
                    Más de ₡35.000
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Grid de productos demo */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
              <span>{PRODUCTS.length} productos</span>
              <button className="flex items-center gap-1 hover:text-[#6b21a8]">
                Ordenar: <span className="font-semibold">Destacados</span> ▾
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PRODUCTS.map((p) => (
                <article
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Imagen dummy */}
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
                  </div>

                  {/* Info */}
                  <div className="p-3 text-xs">
                    <p className="text-gray-500">{p.brand}</p>
                    <p className="mt-1 text-gray-900">{p.name}</p>
                    <p className="mt-2 font-semibold text-[#6b21a8]">
                      {p.price}
                    </p>
                    <button className="mt-2 w-full text-center text-[11px] font-semibold text-white bg-[#a855f7] hover:bg-[#7e22ce] rounded-lg py-1.5">
                      Agregar al carrito
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>    
      </main>
    </div>
  );
}
