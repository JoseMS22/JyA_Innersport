// frontend/components/MainMenu.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar"; // 👈 NUEVO

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export function MainMenu() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  // Cargar usuario actual (si hay cookie)
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    }

    fetchMe();
  }, [API_BASE_URL]);

  async function handleLogout() {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignoramos errores para no molestar al usuario
    } finally {
      setUser(null);
      router.push("/");
    }
  }

  const isActive = (href: string) => pathname === href;

  return (
    <header className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-50">
      {/* Barra superior tipo aviso */}
      <div className="bg-[#0ea5e9] text-white text-xs text-center py-1.5 px-4">
        <span className="hidden sm:inline">
          Recibí tu pedido el mismo día con envío rápido realizando tu compra antes de la 1:00 pm 📦
        </span>
        <span className="sm:hidden">Envío rápido antes de 1:00 pm 📦</span>
      </div>

      {/* Navbar principal */}
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
        {/* Logo */}
        <button
          className="flex items-center gap-2 flex-shrink-0"
          onClick={() => router.push("/")}
        >
          <Image
            src="/logo.png"
            alt="JYA Innersport"
            width={46}
            height={46}
            className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
          />
          <span className="hidden sm:block font-bold tracking-wide text-[#6b21a8]">
            JYA<span className="text-[#a855f7]"> Innersport</span>
          </span>
        </button>

        {/* 🔍 BARRA DE BÚSQUEDA - RESPONSIVE */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <SearchBar />
        </div>

        {/* Zona derecha: usuario + carrito */}
        <div className="flex items-center gap-3">
          {/* Botón usuario: login / logout */}
          {!checking && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  {/* Nombre de usuario clicable que lleva al perfil */}
                  <span className="hidden sm:inline text-xs text-gray-600">
                    Hola,{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push("/account/profile")}
                    className="hidden sm:inline text-xs text-gray-800 hover:text-[#6b21a8] font-medium"
                  >
                    {user.nombre}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="text-xs font-semibold text-[#6b21a8] hover:text-[#a855f7]"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => router.push("/login")}
                    className="font-semibold text-[#6b21a8] hover:text-[#a855f7]"
                  >
                    Iniciar sesión
                  </button>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => router.push("/register")}
                    className="font-semibold text-[#eab308] hover:text-[#ca8a04]"
                  >
                    Crear cuenta
                  </button>
                </div>
              )}
            </>
          )}

          {/* Carrito dummy */}
          <button
            aria-label="Carrito"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-[#a855f7] hover:bg-[#a855f7]/5 relative transition-colors"
          >
            🛒
            <span className="absolute -top-1 -right-1 text-[10px] bg-[#a855f7] text-white rounded-full px-1.5 py-0.5 font-semibold">
              0
            </span>
          </button>
        </div>
      </div>

      {/* 📱 BÚSQUEDA MÓVIL - Debajo del navbar */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>

      {/* Menú de categorías - Opcional */}
      <nav className="hidden lg:flex items-center justify-center gap-6 px-4 py-2 border-t border-gray-100 text-sm text-gray-700">
        <Link
          href="/catalogo"
          className={`hover:text-[#6b21a8] transition-colors ${
            isActive("/catalogo") ? "font-semibold text-[#6b21a8]" : ""
          }`}
        >
          Todo
        </Link>
        <button className="hover:text-[#6b21a8] transition-colors">Lo nuevo</button>
        <button className="hover:text-[#6b21a8] transition-colors">Hombre</button>
        <button className="hover:text-[#6b21a8] transition-colors">Mujer</button>
        <button className="hover:text-[#6b21a8] transition-colors">Niños</button>
        <button className="hover:text-[#6b21a8] transition-colors text-red-600 font-medium">
          Sale
        </button>
      </nav>
    </header>
  );
}