// frontend/app/account/delete/page.tsx

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { useNotifications } from "../../context/NotificationContext";

type MeResponse = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export default function DeleteAccountPage() {
  const router = useRouter();
  const { success, error: showError } = useNotifications();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

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

      // Marcar como eliminada y mostrar mensaje
      setIsDeleted(true);
      success(
        "Cuenta desactivada",
        res?.detail ?? "Tu cuenta ha sido desactivada y se ha iniciado el proceso de eliminación."
      );

      // Redirigir al home después de 3 segundos
      setTimeout(() => {
        router.push("/");
      }, 3000);
      
    } catch (err: any) {
      // Manejo de errores más específico
      if (err.message.includes("No se encontró token")) {
        showError(
          "Sesión expirada",
          "Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
        );
        setTimeout(() => router.push("/login"), 2000);
      } else {
        showError(
          "Error al eliminar cuenta",
          err.message ?? "No se pudo procesar la solicitud."
        );
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
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center py-3 gap-2 mb-6 text-sm">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Inicio
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push("/account/profile")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mi cuenta
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Mis direcciones
          </span>
        </div>

        {/* Card principal */}
        <div className="bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8 space-y-4">
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

          {/* Mostrar mensaje de éxito grande si ya se eliminó */}
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
                <p className="text-sm text-emerald-700">
                  Tu cuenta ha sido desactivada correctamente
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

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    disabled={submitting}
                    className="flex-1 rounded-lg border border-gray-300 text-gray-700 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 !text-white font-medium py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}