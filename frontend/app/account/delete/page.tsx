"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/Logo";

type MeResponse = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export default function DeleteAccountPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false); // 🔹 NUEVO: flag para saber si ya eliminó

  // 1) Traer datos del usuario con /auth/me
  useEffect(() => {
    async function fetchMe() {
      try {
        const data = await apiFetch("/api/v1/auth/me", { method: "GET" });
        setMe(data);
      } catch (_err) {
        // Si no hay sesión, mandamos al login
        router.push("/login");
      } finally {
        setLoadingMe(false);
      }
    }

    fetchMe();
  }, [router]);

  // 2) Manejar envío del formulario de eliminación
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      password: formData.get("password") as string,
      confirm: formData.get("confirm") === "on",
    };

    try {
      const res = await apiFetch("/api/v1/auth/delete-account", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // 🔹 MEJORA: Marcar como eliminada y mostrar mensaje
      setIsDeleted(true);
      setSuccessMsg(
        res?.detail ??
          "Tu cuenta ha sido desactivada y se ha iniciado el proceso de eliminación."
      );

      // 🔹 MEJORA: Redirigir al home después de 3 segundos
      setTimeout(() => {
        router.push("/");
      }, 3000);

      // 🔹 NOTA: NO hacer logout manual aquí porque el backend ya borró la cookie
      // en el endpoint /delete-account
      
    } catch (err: any) {
      // 🔹 MEJORA: Manejo de errores más específico
      if (err.message.includes("No se encontró token")) {
        setErrorMsg("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setErrorMsg(err.message ?? "No se pudo procesar la solicitud.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 3) Mientras carga
  if (loadingMe) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#a855f7] border-t-transparent"></div>
          <p className="text-sm text-gray-600">Cargando tu cuenta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8 space-y-4">
        {/* Encabezado */}
        <div className="flex flex-col items-center gap-2">
          <Logo size={120} />
          <h1 className="text-xl font-semibold text-[#6b21a8]">
            Eliminar cuenta
          </h1>
          {me && (
            <p className="text-xs text-gray-600 text-center">
              Estás a punto de solicitar la eliminación de la cuenta asociada a{" "}
              <span className="font-semibold">{me.correo}</span>.
            </p>
          )}
        </div>

        {/* 🔹 NUEVO: Mostrar mensaje de éxito grande si ya se eliminó */}
        {isDeleted ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 text-center">
              <div className="mb-3">
                <svg
                  className="w-16 h-16 text-emerald-600 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-emerald-800 mb-2">
                Cuenta desactivada
              </h2>
              <p className="text-sm text-emerald-700 whitespace-pre-line">
                {successMsg}
              </p>
              <p className="text-xs text-emerald-600 mt-3">
                Redirigiendo a la página principal...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Advertencia */}
            <div className="bg-[#fef3c7] border border-[#facc15]/60 rounded-xl p-3 text-xs text-[#854d0e]">
              <p className="font-semibold mb-1">⚠️ Advertencia importante</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Tu cuenta se desactivará inmediatamente.</li>
                <li>No podrás iniciar sesión durante el periodo de gracia.</li>
                <li>
                  La cuenta se eliminará de forma permanente después de{" "}
                  <span className="font-semibold">6 meses</span>, salvo restricciones
                  legales o de negocio.
                </li>
              </ul>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  disabled={submitting}
                  className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] disabled:bg-gray-100"
                  placeholder="Escribe tu contraseña para confirmar"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  name="confirm"
                  className="mt-[2px]"
                  required
                  disabled={submitting}
                />
                <span>
                  Confirmo que deseo desactivar mi cuenta y entiendo que se
                  eliminará de forma permanente tras el periodo de gracia de 6
                  meses.
                </span>
              </label>

              {/* 🔹 MEJORA: Mensajes de error más visibles */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xs text-red-700">{errorMsg}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-300 text-gray-700 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    "Solicitar eliminación"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}