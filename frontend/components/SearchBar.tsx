// frontend/components/SearchBar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Sugerencia = {
  id: number;
  nombre: string;
  precio_minimo: number;
  imagen_principal: string | null;
  categorias: string[];
  sku?: string;
  tipo: "producto" | "categoria";
};

type SugerenciasResponse = {
  productos: Array<{
    id: number;
    nombre: string;
    precio_minimo: number;
    imagen_principal: string | null;
    categorias: string[];
    sku?: string;
  }>;
  categorias: string[];
};

interface SearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className = "" }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  function resolveImageUrl(path: string | null) {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    // path tipo "/media/xxx.jpg"
    return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  }


  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSugerencias(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar sugerencias con debounce
  useEffect(() => {
    if (!query.trim()) {
      setSugerencias([]);
      setShowSugerencias(false);
      return;
    }

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Crear nuevo timeout para debounce (300ms)
    timeoutRef.current = setTimeout(async () => {
      await buscarSugerencias(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  async function buscarSugerencias(searchQuery: string) {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        buscar: searchQuery.trim(),
        solo_disponibles: "true",
        por_pagina: "5", // Limitar a 5 sugerencias
      });

      const res = await fetch(`${API_BASE_URL}/api/v1/catalogo?${params.toString()}`);
      const data = await res.json();

      // Transformar productos en sugerencias
      const productosSugerencias: Sugerencia[] = data.productos.map((p: any) => ({
        ...p,
        imagen_principal: resolveImageUrl(p.imagen_principal), // ✅ aquí
        tipo: "producto" as const,
      }));


      // Extraer categorías únicas de los productos encontrados
      const categoriasUnicas = Array.from(
        new Set(
          data.productos.flatMap((p: any) => p.categorias)
        )
      ) as string[];

      const categoriasSugerencias: Sugerencia[] = categoriasUnicas
        .filter((cat) => cat.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3) // Máximo 3 categorías
        .map((cat, index) => ({
          id: -index - 1, // ID negativo para distinguir categorías
          nombre: cat,
          precio_minimo: 0,
          imagen_principal: null,
          categorias: [cat],
          tipo: "categoria" as const,
        }));

      // Combinar sugerencias: primero productos, luego categorías
      setSugerencias([...productosSugerencias, ...categoriasSugerencias]);
      setShowSugerencias(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Error buscando sugerencias:", error);
      setSugerencias([]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    // Si hay una sugerencia seleccionada, usarla
    if (selectedIndex >= 0 && selectedIndex < sugerencias.length) {
      handleSelectSugerencia(sugerencias[selectedIndex]);
      return;
    }

    // Si no, ejecutar búsqueda normal
    ejecutarBusqueda(query);
  }

  function ejecutarBusqueda(searchQuery: string) {
    setShowSugerencias(false);
    setSelectedIndex(-1);

    // Si el componente tiene callback onSearch, usarlo
    if (onSearch) {
      onSearch(searchQuery);
      return;
    }

    // Si no, navegar a la página con query params
    router.push(`/?buscar=${encodeURIComponent(searchQuery)}`);
  }

  function handleSelectSugerencia(sugerencia: Sugerencia) {
    if (sugerencia.tipo === "producto") {
      // Navegar al detalle del producto
      router.push(`/productos/${sugerencia.id}`);
    } else {
      // Es una categoría, buscar por categoría
      if (onSearch) {
        onSearch(`categoria:${sugerencia.nombre}`);
      } else {
        router.push(`/?categoria=${encodeURIComponent(sugerencia.nombre)}`);
      }
    }

    setQuery("");
    setSugerencias([]);
    setShowSugerencias(false);
    setSelectedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSugerencias || sugerencias.length === 0) return;

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
      case "Escape":
        setShowSugerencias(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case "Enter":
        if (selectedIndex >= 0) {
          e.preventDefault();
          handleSelectSugerencia(sugerencias[selectedIndex]);
        }
        break;
    }
  }

  function formatoPrecio(precio: number) {
    return `₡${precio.toLocaleString("es-CR")}`;
  }

  function highlightMatch(text: string, search: string) {
    if (!search.trim()) return text;

    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (sugerencias.length > 0) {
              setShowSugerencias(true);
            }
          }}
          placeholder="Buscar productos, categorías o SKU..."
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 
                     focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 
                     outline-none transition-all text-sm"
          aria-label="Buscar productos"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSugerencias}
        />

        {/* Ícono de búsqueda */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Botón limpiar */}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSugerencias([]);
              setShowSugerencias(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Panel de sugerencias */}
      {showSugerencias && sugerencias.length > 0 && (
        <div
          id="search-suggestions"
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 
                     overflow-hidden max-h-[420px] overflow-y-auto"
          role="listbox"
        >
          {sugerencias.map((sugerencia, index) => (
            <button
              key={`${sugerencia.tipo}-${sugerencia.id}`}
              onClick={() => handleSelectSugerencia(sugerencia)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-[#faf5ff] transition-colors
                         ${selectedIndex === index ? "bg-[#faf5ff]" : ""}
                         ${index > 0 ? "border-t border-gray-100" : ""}`}
              role="option"
              aria-selected={selectedIndex === index}
            >
              {sugerencia.tipo === "producto" ? (
                <div className="flex items-center gap-3">
                  {/* Imagen */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-[#111827] to-[#a855f7]">
                    {sugerencia.imagen_principal ? (
                      <img
                        src={sugerencia.imagen_principal}
                        alt={sugerencia.nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png";
                        }}
                      />

                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {highlightMatch(sugerencia.nombre, query)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-[#6b21a8] font-semibold">
                        {formatoPrecio(sugerencia.precio_minimo)}
                      </p>
                      {sugerencia.categorias.length > 0 && (
                        <span className="text-xs text-gray-500">
                          • {sugerencia.categorias[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Indicador */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Ícono de categoría */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#fef3c7] flex items-center justify-center">
                    <span className="text-xl">🏷️</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {highlightMatch(sugerencia.nombre, query)}
                    </p>
                    <p className="text-xs text-gray-500">Categoría</p>
                  </div>

                  {/* Indicador */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}

          {/* Footer con indicación */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Presiona <kbd className="px-1 py-0.5 bg-white border rounded text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] ml-1">↓</kbd> para navegar,
              <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] ml-1">Enter</kbd> para seleccionar
            </p>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {showSugerencias && !loading && sugerencias.length === 0 && query.trim() && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            No se encontraron resultados
          </p>
          <p className="text-xs text-gray-500">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}
    </div>
  );
}