// frontend/components/AdminMenu.tsx
"use client";

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
];

export function AdminMenu({ user, onLogout }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Para el panel solo coincidencia exacta
    if (href === "/admin") {
      return pathname === "/admin";
    }

    // Para el resto, exacto o subrutas
    return pathname === href || pathname.startsWith(href + "/");
  };


  return (
    <header className="border-b border-[#e5e7eb] bg-white/95 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-4">
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

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-gray-700">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                "px-2.5 py-1.5 rounded-full hover:text-[#6b21a8] transition-colors" +
                (isActive(link.href)
                  ? " bg-[#f5f3ff] text-[#6b21a8] border border-[#a855f7]/40 shadow-sm"
                  : "")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Usuario / logout */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-gray-500 uppercase tracking-wide text-[10px]">
              ADMIN
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
  );
}
