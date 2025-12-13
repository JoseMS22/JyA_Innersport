// frontend/app/forgot-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/api";
import { useNotifications } from "@/app/context/NotificationContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success, error: showError } = useNotifications();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ correo: email }),
      });

      success(
        "Enlace enviado",
        "Revisa tu bandeja de entrada y spam. El enlace expirará en 30 minutos."
      );
      setEmail(""); // Limpiar campo
    } catch (err: any) {
      // Manejar rate limiting
      if (err.message?.includes("Demasiados intentos")) {
        showError("Demasiados intentos", err.message);
      } else {
        showError(
          "Error al procesar solicitud",
          "No pudimos procesar tu solicitud. Por favor intenta de nuevo."
        );
      }
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
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm text-center text-gray-600">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo de correo */}
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
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-medium py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>

          {/* Enlaces */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full text-center text-sm text-[#6b21a8] hover:text-[#a855f7] hover:underline underline-offset-2 font-medium transition-colors"
            >
              ← Volver a iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="w-full text-center text-xs text-gray-600 hover:text-[#a855f7] hover:underline underline-offset-2 transition-colors"
            >
              ¿No tienes cuenta? Regístrate aquí
            </button>
          </div>
        </form>

        {/* Información de seguridad */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800 font-medium mb-1">
            🔒 Seguridad
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• El enlace es de un solo uso</li>
            <li>• Expira en 30 minutos</li>
            <li>• Máximo 3 intentos por hora</li>
          </ul>
        </div>
      </div>
    </div>
  );
}