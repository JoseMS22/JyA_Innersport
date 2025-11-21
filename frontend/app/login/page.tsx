// frontend/app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

    // Si todo bien → home
    router.push("/");
  } catch (err: any) {
    const msg = err?.message ?? "Error al iniciar sesión";

    if (typeof msg === "string" && msg.startsWith("CUENTA_PENDIENTE_ELIMINACION;")) {
      // msg viene como: "CUENTA_PENDIENTE_ELIMINACION;2026-01-01T12:00:00+00:00"
      const [, deletionIso] = msg.split(";", 2);

      const params = new URLSearchParams();
      params.set("correo", payload.correo);
      if (deletionIso) params.set("deletion", deletionIso);

      router.push(`/account/reactivate?${params.toString()}`);
      return;
    }

    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Logo size={120} />
          <h1 className="mt-4 text-2xl font-bold text-[#6b21a8]">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 outline-none border-[#e5e7eb] focus:border-[#a855f7] transition-colors"
              placeholder="tu@correo.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Contraseña con ojo */}
          <PasswordInput
            label="Contraseña"
            value={password}
            onChange={setPassword}
            placeholder="Ingresa tu contraseña"
            required
            disabled={loading}
            autoComplete="current-password"
          />

          {/* Olvidé mi contraseña */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-xs text-[#6b21a8] hover:text-[#a855f7] font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{errorMsg}</p>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>

          {/* Registro */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="text-[#6b21a8] hover:text-[#a855f7] font-medium"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}