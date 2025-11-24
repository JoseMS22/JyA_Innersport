// frontend/app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminMenu } from "@/components/AdminMenu";

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = (await res.json()) as UserMe;

        if (data.rol !== "ADMIN") {
          router.replace("/");
          return;
        }

        setUser(data);
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [API_BASE_URL, router]);

  async function handleLogout() {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignoramos errores
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center text-sm text-gray-600">
        Cargando panel de administración...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <AdminMenu user={user} onLogout={handleLogout} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
