// frontend/components/MainMenu.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useCart } from "../app/context/cartContext";
import { useFavorites } from "../app/context/favoritesContext";
import { SearchBar } from "./SearchBar";

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type CategoriaMenu = {
  id: number;
  slug: string;
  nombre: string;
  principal: boolean;
  secundaria: boolean;
  productos_count?: number;
  secundarias: CategoriaMenu[];
};

export function MainMenu() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [checking, setChecking] = useState(true);
  const [compact, setCompact] = useState(false);

  // 🔍 buscador
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // 👤 menú perfil invitado (desktop)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ☰ menú móvil (lateral)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { totalItems, setUserId: setCartUserId, clearCart } = useCart();
  const { setUserId: setFavUserId, clearFavorites } = useFavorites();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const [menuCategorias, setMenuCategorias] = useState<CategoriaMenu[]>([]);

  function categoriaUrl(principalSlug: string, secundariaSlug?: string) {
    if (secundariaSlug) {
      return `/categorias/${principalSlug}/${secundariaSlug}`;
    }
    return `/categorias/${principalSlug}`;
  }

  // Detectar scroll → barra compacta
  useEffect(() => {
    function handleScroll() {
      if (typeof window === "undefined") return;
      setCompact(window.scrollY > 80);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Focus automático en el buscador
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Verificar autenticación
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          setUser(null);
          setCartUserId(null);
          setFavUserId(null);
        } else {
          const data = await res.json();
          setUser(data);
          setCartUserId(data.id);
          setFavUserId(data.id);
        }
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        setUser(null);
        setCartUserId(null);
        setFavUserId(null);
      } finally {
        setChecking(false);
      }
    }

    fetchMe();
  }, [API_BASE_URL, setCartUserId, setFavUserId]);

  // Bloquear scroll cuando menú móvil está abierto
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (mobileMenuOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  // Cargar categorías para el menú
  useEffect(() => {
    async function loadMenuCategorias() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/categorias/menu`, {
          credentials: "include",
        });

        if (!res.ok) {
          console.error("Error /categorias/menu status:", res.status);
          return;
        }

        const data = (await res.json()) as CategoriaMenu[];
        setMenuCategorias(data);
      } catch (err) {
        console.error("Error cargando categorías de menú:", err);
      }
    }

    loadMenuCategorias();
  }, [API_BASE_URL]);

  async function handleLogout() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        console.log("Logout exitoso");
      }
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      setUser(null);
      clearCart();
      clearFavorites();
      setCartUserId(null);
      setFavUserId(null);
      setProfileMenuOpen(false);
      setMobileMenuOpen(false);
      router.push("/");
    }
  }

  const isActive = (href: string) => {
    if (!pathname) return false;

    if (href.startsWith("/categorias/")) {
      return pathname === href || pathname.startsWith(href + "/");
    }

    return pathname === href;
  };

  function handleToggleSearch() {
    setSearchOpen((prev) => !prev);
  }

  function handleCloseSearch() {
    setSearchOpen(false);
  }

  function goToLogin() {
    setProfileMenuOpen(false);
    router.push("/login");
  }

  function goToRegister() {
    setProfileMenuOpen(false);
    router.push("/register");
  }

  function handleProfileClick() {
    setProfileMenuOpen((prev) => !prev);
  }

  function navigateFromMobile(href: string) { setMobileMenuOpen(false); router.push(href); }


  function goToCategoria(slug: string) {
    router.push(categoriaUrl(slug));
  }

  function goToCategoria(slug: string) {
    router.push(categoriaUrl(slug));
  }

  function goToCategoriaFromMobile(slug: string) {
    setMobileMenuOpen(false);
    router.push(categoriaUrl(slug));
  }

  const navItemClass = (active?: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm transition-colors",
      "text-[#6b21a8]",
      active
        ? "bg-[#f3e8ff] border border-[#e9d5ff] shadow-sm"
        : "hover:bg-[#f3e8ff] hover:border hover:border-[#e9d5ff]",
    ].join(" ");

  const mobileItemClass = `
    w-full px-3 py-2 text-left text-[#6b21a8]
    rounded-xl
    hover:bg-[#f3e8ff]
    transition-colors
  `;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* HEADER FIJO */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 border-b border-[#e5e7eb] bg-[#fdf7ee]/90 backdrop-blur transition-shadow ${compact ? "shadow-sm" : ""
          }`}
      >
        {/* Franja superior: logo centrado + redes */}
        <div
          className={`transition-all duration-300 overflow-hidden border-b border-[#e5e7eb]/60 ${compact ? "max-h-0 opacity-0" : "max-h-20 opacity-100"
            }`}
        >
          <div className="max-w-6xl mx-auto relative px-4 py-3 flex items-center justify-center">
            <Link href="/" className="flex items-center gap-3 mx-auto">
              <Image
                src="/logo.png"
                alt="JYA Innersport"
                width={52}
                height={52}
                className="drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]"
              />
              <div className="flex flex-col items-start">
                <span className="text-xs uppercase tracking-[0.25em] text-gray-400">
                  Tienda Virtual
                </span>
                <span className="font-bold text-lg tracking-wide text-[#6b21a8]">
                  JYA<span className="text-[#a855f7]"> Innersport</span>
                </span>
              </div>
            </Link>

            {/* Redes desktop */}
            <div className="hidden sm:flex items-center gap-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2">
              <Link
                href="https://facebook.com/TU_PAGINA"
                target="_blank"
                className="hover:text-[#6b21a8]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S2 6.48 2 12.07c0 5.02 3.66 9.19 8.44 9.93v-7.03H8.08v-2.9h2.36V9.96c0-2.33 1.39-3.62 3.52-3.62 1.02 0 2.09.18 2.09.18v2.29h-1.18c-1.16 0-1.52.72-1.52 1.46v1.75h2.59l-.41 2.9h-2.18v7.03c4.78-.74 8.44-4.91 8.44-9.93z" />
                </svg>
              </Link>

              <Link
                href="https://instagram.com/TU_PAGINA"
                target="_blank"
                className="hover:text-[#6b21a8]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.65 0 3 1.35 3 3v10c0 1.65-1.35 3-3 3H7c-1.65 0-3-1.35-3-3V7c0-1.65 1.35-3 3-3h10zm-5 3.3A4.7 4.7 0 1016.7 12 4.7 4.7 0 0012 7.3zm0 7.7A3 3 0 1115 12a3 3 0 01-3 3zm4.75-8.75a1.15 1.15 0 11-1.15-1.15 1.15 1.15 0 011.15 1.15z" />
                </svg>
              </Link>

              <Link
                href="https://tiktok.com/@TU_PAGINA"
                target="_blank"
                className="hover:text-[#6b21a8]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5 2h3.1c.1 1.4.6 2.6 1.6 3.6s2.2 1.5 3.6 1.6v3.1c-1.6 0-3-.4-4.3-1.3v7c0 2-1 3.9-2.7 5-1.7 1.2-3.9 1.3-5.7.6-1.8-.7-3.1-2.2-3.6-4-.5-1.8-.1-3.8 1-5.2 1.2-1.4 3-2.2 4.9-2.1v3.2c-.8-.1-1.7.2-2.3.8-.6.6-.9 1.5-.7 2.3.2.8.8 1.5 1.6 1.8s1.7.1 2.4-.4c.7-.5 1.1-1.3 1.1-2.1V2z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Fila principal */}
        <div className="bg-white/80">
          <div className="max-w-6xl mx-auto px-4 py-3">
            {/* Móvil: hamburguesa + search + carrito */}
            <div className="flex items-center justify-between md:hidden">
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white hover:border-[#a855f7] hover:text-[#6b21a8] shadow-sm"
              >
                {/* Icono hamburguesa igual estilo Admin */}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M4 7h16M4 12h16M4 17h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Buscar"
                  onClick={handleToggleSearch}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-[#a855f7] text-[#a855f7] text-lg bg-white"
                >
                  🔍
                </button>

                <button
                  aria-label="Carrito"
                  onClick={() => router.push("/cart")}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-[#a855f7] relative bg-white"
                >
                  🛒
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-[#a855f7] text-white rounded-full px-1">
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop: lupa + menú + perfil+carrito */}
            <div className="hidden md:flex items-center gap-4">
              <button
                type="button"
                aria-label="Buscar"
                onClick={handleToggleSearch}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-[#a855f7] text-[#a855f7] text-lg bg-white"
              >
                🔍
              </button>

              <nav className="flex-1 flex items-center justify-center gap-4">
                <button
                  type="button"
                  className={navItemClass(isActive("/nuevo"))}
                  onClick={() => router.push("/nuevo")}
                >
                  Lo nuevo
                </button>

                <button
                  type="button"
                  className={navItemClass(isActive("/favorites"))}
                  onClick={() => router.push("/favorites")}
                >
                  Favoritos
                </button>

                {menuCategorias.map((cat) => (
                  <div key={cat.id} className="relative group">
                    <button
                      type="button"
                      className={navItemClass(isActive(categoriaUrl(cat.slug)))}
                      onClick={() => router.push(categoriaUrl(cat.slug))}
                    >
                      {cat.nombre}
                    </button>



                    {cat.secundarias && cat.secundarias.length > 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover:block bg-white border border-gray-200 rounded-2xl shadow-lg min-w-[180px] z-50">
                        <button
                          type="button"
                          onClick={() => router.push(categoriaUrl(cat.slug))}
                          className="block w-full text-left px-4 py-2 text-[11px] text-[#6b21a8] hover:bg-[#f3e8ff]"
                        >
                          Ver todo
                        </button>

                        {cat.secundarias.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              router.push(categoriaUrl(cat.slug, sub.slug))
                            }

                            className="block w-full text-left px-4 py-2 text-[11px] text-gray-700 hover:bg-[#f3e8ff]"
                          >
                            {sub.nombre}
                          </button>
                        ))}

                      </div>
                    )}
                  </div>
                ))}
              </nav>

              <div className="relative flex items-center gap-3 flex-shrink-0">
                {!checking && (
                  <button
                    aria-label="Perfil"
                    onClick={handleProfileClick}
                    className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-[#a855f7] bg-white"
                  >
                    👤
                  </button>
                )}

                {!checking && profileMenuOpen && (
                  <div className="absolute right-10 top-full mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-2 text-xs z-50">
                    {user ? (
                      <>
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            router.push("/account/profile");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          Perfil
                        </button>

                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            router.push("/account/addresses");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          Direcciones
                        </button>

                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            router.push("/account/orders");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          Mis pedidos
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                        >
                          Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={goToLogin}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
                        >
                          Iniciar sesión
                        </button>
                        <button
                          onClick={goToRegister}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-[#a855f7] font-semibold"
                        >
                          Crear cuenta
                        </button>
                      </>
                    )}
                  </div>
                )}

                <button
                  aria-label="Carrito"
                  onClick={() => router.push("/cart")}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:border-[#a855f7] relative bg-white"
                >
                  🛒
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-[#a855f7] text-white rounded-full px-1">
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda */}
        {searchOpen && (
          <div className="bg-white/95 border-t border-gray-100">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <SearchBar
                  className="w-full"
                  onSearch={(q) => {
                    const query = q.trim();
                    if (!query) return;

                    const params = new URLSearchParams(searchParams.toString());
                    params.set("buscar", query);
                    params.delete("pagina");

                    router.push(`/?${params.toString()}`);
                    setSearchOpen(false);
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleCloseSearch}
                className="text-xs uppercase tracking-wide text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MENÚ MÓVIL LATERAL (estilo Admin) */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            onClick={closeMobileMenu}
          />

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] transform bg-white shadow-xl border-r border-gray-200 transition-transform duration-200 ease-out md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
          >
            {/* Header del sidebar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f5f3ff] flex items-center justify-center text-xs font-bold text-[#6b21a8]">
                  {user?.nombre?.charAt(0) || "J"}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-gray-800">
                    {user ? user.nombre : "Invitado"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6l-12 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Navegación */}
            <nav className="px-3 py-3 space-y-1 text-sm overflow-y-auto max-h-[calc(100vh-180px)]">
              <button
                className={mobileItemClass}
                onClick={() => navigateFromMobile("/nuevo")}
              >
                Lo nuevo
              </button>

              <button
                className={mobileItemClass}
                onClick={() => navigateFromMobile("/favorites")}
              >
                Favoritos
              </button>

              {menuCategorias.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <button
                    className={mobileItemClass}
                    onClick={() =>
                      navigateFromMobile(categoriaUrl(cat.slug))
                    }
                  >
                    {cat.nombre}
                  </button>

                  {cat.secundarias && cat.secundarias.length > 0 && (
                    <div className="ml-2 rounded-xl bg-[#fdf7ff] border border-[#f3e8ff]">
                      {cat.secundarias.map((sub) => (
                        <button
                          key={sub.id}
                          className="w-full text-left px-4 py-2 text-[13px] text-[#6b21a8] border-b border-[#f3e8ff] last:border-b-0 hover:bg-[#f3e8ff]"
                          onClick={() =>
                            navigateFromMobile(
                              categoriaUrl(cat.slug, sub.slug)
                            )
                          }
                        >
                          {sub.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Footer: cuenta + redes */}
            <div className="mt-auto px-4 py-4 border-t border-gray-100 space-y-3 text-sm">
              {user ? (
                <div className="flex flex-col gap-2 text-xs">
                  <button
                    onClick={() => navigateFromMobile("/account/profile")}
                    className="text-left text-[#6b21a8]"
                  >
                    Perfil
                  </button>
                  <button
                    onClick={() => navigateFromMobile("/account/addresses")}
                    className="text-left text-[#6b21a8]"
                  >
                    Direcciones
                  </button>
                  <button
                    onClick={() => navigateFromMobile("/account/orders")}
                    className="text-left text-[#6b21a8]"
                  >
                    Mis pedidos
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-left text-red-500"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigateFromMobile("/login")}
                  className="flex items-center gap-2 text-xs text-[#6b21a8]"
                >
                  <span>👤</span>
                  <span>Registro / Inicio de sesión</span>
                </button>
              )}

              <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                <Link
                  href="https://facebook.com/TU_PAGINA"
                  target="_blank"
                  className="hover:text-[#6b21a8]"
                >
                  Facebook
                </Link>
                <Link
                  href="https://instagram.com/TU_PAGINA"
                  target="_blank"
                  className="hover:text-[#6b21a8]"
                >
                  Instagram
                </Link>
                <Link
                  href="https://tiktok.com/@TU_PAGINA"
                  target="_blank"
                  className="hover:text-[#6b21a8]"
                >
                  TikTok
                </Link>
              </div>

              <p className="text-[10px] text-gray-400">
                JYA Innersport · Tienda virtual
              </p>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
