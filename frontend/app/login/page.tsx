// frontend/app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../../components/Logo";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      correo: formData.get("correo") as string,
      password: formData.get("password") as string,
    };

    try {
      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Aquí el backend devuelve el token, pero lo importante es la cookie HttpOnly
      // Redirigimos al home o al dashboard
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8">
        <div className="flex flex-col items-center mb-6">
          <Logo size={160} />
        </div>

        <h1 className="text-xl font-semibold text-center text-[#6b21a8] mb-4">
          Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <input
            type="email"
            name="correo"
            placeholder="Correo electrónico"
            className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
            required
          />

          {errorMsg && (
            <div className="text-xs text-red-600 whitespace-pre-line">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2 text-sm disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>

          <p className="mt-2 text-xs text-center text-[#6b21a8]">
            ¿Aún no tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="font-semibold text-[#eab308] hover:underline"
            >
              Crear cuenta
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
