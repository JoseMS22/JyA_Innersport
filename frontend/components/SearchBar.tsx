// frontend/components/SearchBar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Sugerencia = {
  id: number;
  nombre: string;
  categoria?: string;
  tipo: "producto" | "categoria";
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar sugerencias con debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/productos/sugerencias?q=${encodeURIComponent(query)}&limit=8`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          setSugerencias(data);
          setMostrarSugerencias(data.length > 0);
        }
      } catch (error) {
        console.error("Error buscando sugerencias:", error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [query]);

  // Manejar navegación con teclado
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!mostrarSugerencias || sugerencias.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < sugerencias.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < sugerencias.length) {
          seleccionarSugerencia(sugerencias[selectedIndex]);
        } else if (query.trim()) {
          buscar();
        }
        break;

      case "Escape":
        setMostrarSugerencias(false);
        setSelectedIndex(-1);
        break;
    }
  }

  function seleccionarSugerencia(sugerencia: Sugerencia) {
    if (sugerencia.tipo === "producto") {
      router.push(`/productos/${sugerencia.id}`);
    } else {
      router.push(`/catalogo?categoria=${sugerencia.id}`);
    }
    setQuery("");
    setMostrarSugerencias(false);
    setSelectedIndex(-1);
  }

  function buscar() {
    if (query.trim()) {
      router.push(`/catalogo?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setMostrarSugerencias(false);
      setSelectedIndex(-1);
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (sugerencias.length > 0) {
              setMostrarSugerencias(true);
            }
          }}
          placeholder="Buscar productos..."
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm outline-none 
                     focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 
                     transition-all placeholder-gray-500"
        />

        {/* Ícono de búsqueda */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-[#a855f7] border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Panel de sugerencias */}
      {mostrarSugerencias && sugerencias.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="py-1">
            {sugerencias.map((sugerencia, index) => (
              <button
                key={`${sugerencia.tipo}-${sugerencia.id}`}
                onClick={() => seleccionarSugerencia(sugerencia)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${
                    index === selectedIndex
                      ? "bg-[#a855f7]/10 text-[#6b21a8]"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {/* Ícono según tipo */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                    ${
                      sugerencia.tipo === "producto"
                        ? "bg-[#a855f7]/10 text-[#a855f7]"
                        : "bg-[#facc15]/10 text-[#eab308]"
                    }`}
                  >
                    {sugerencia.tipo === "producto" ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{sugerencia.nombre}</p>
                    {sugerencia.categoria && (
                      <p className="text-xs text-gray-500 truncate">
                        {sugerencia.categoria}
                      </p>
                    )}
                    {sugerencia.tipo === "categoria" && (
                      <p className="text-xs text-gray-500">Ver categoría</p>
                    )}
                  </div>

                  {/* Flecha indicadora */}
                  <svg
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Footer con hint de búsqueda completa */}
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
            <button
              onClick={buscar}
              className="text-xs text-[#6b21a8] hover:text-[#a855f7] font-medium flex items-center gap-1"
            >
              Ver todos los resultados para "{query}"
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {mostrarSugerencias && !loading && query.length >= 2 && sugerencias.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="text-center text-sm text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium text-gray-700">No encontramos resultados</p>
            <p className="mt-1">Intenta con otro término de búsqueda</p>
          </div>
        </div>
      )}
    </div>
  );
}