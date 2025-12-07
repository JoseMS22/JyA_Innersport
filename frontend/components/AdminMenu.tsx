// frontend/components/AdminMenu.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type Props = {
  user: UserMe;
  onLogout: () => void;
};

const links = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/sucursales", label: "Sucursales" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/historial-precios", label: "Historial de precios" },
  { href: "/admin/home-hero", label: "Portada" },
  { href: "/admin/programa-puntos", label: "Programa de puntos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/pos/ventas", label: "Ventas POS" },
];

export function AdminMenu({ user, onLogout }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* HEADER SUPERIOR */}
      <header className="border-b border-[#e5e7eb] bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
          {/* Izquierda: botón menú + logo */}
          <div className="flex items-center gap-3">
            {/* Botón hamburguesa */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white shadow-sm hover:border-[#a855f7] hover:text-[#6b21a8] transition-colors"
              aria-label="Abrir menú de administración"
            >
              {/* Icono menú */}
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

            {/* Logo / enlace a panel admin */}
            <Link href="/admin" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="JYA Innersport"
                width={40}
                height={40}
                className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-bold tracking-wide text-[#6b21a8]">
                  JYA<span className="text-[#a855f7]"> Innersport</span>
                </span>
                <span className="text-[11px] text-gray-500">
                  Panel de administración
                </span>
              </div>
            </Link>
          </div>

          {/* Usuario / logout */}
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-gray-500 uppercase tracking-wide text-[10px]">
                {user.rol || "ADMIN"}
              </span>
              <span className="font-semibold text-[#6b21a8]">
                {user.nombre}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-full border border-[#e5e7eb] text-xs font-semibold text-gray-700 hover:border-[#a855f7] hover:text-[#6b21a8] hover:bg-[#f9f5ff]"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* OVERLAY */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={closeMenu}
        />
      )}

      {/* SIDEBAR LATERAL */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80%] transform bg-white shadow-xl border-r border-gray-200 transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header del sidebar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#f5f3ff] flex items-center justify-center text-xs font-bold text-[#6b21a8]">
              {user.nombre?.charAt(0) || "A"}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-gray-800">
                {user.nombre}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                {user.rol || "ADMIN"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeMenu}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500"
          >
            {/* Icono cerrar (X) */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Links del menú */}
        <nav className="px-3 py-3 space-y-1 text-sm">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  active
                    ? "bg-[#f5f3ff] text-[#6b21a8] border border-[#a855f7]/40 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer pequeño dentro del sidebar */}
        <div className="mt-auto px-4 py-3 border-t border-gray-100 text-[10px] text-gray-400">
          Innersport · Panel admin
        </div>
      </aside>
    </>
  );
}
