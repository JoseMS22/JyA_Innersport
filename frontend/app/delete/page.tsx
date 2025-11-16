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

      setSuccessMsg(
        res?.detail ??
          "Tu cuenta ha sido desactivada y se ha iniciado el proceso de eliminación."
      );

      // 3) Forzar logout para borrar la cookie HttpOnly en el backend
      await apiFetch("/api/v1/auth/logout", { method: "POST" });

      // 4) Redirigir al login después de un momento
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message ?? "No se pudo procesar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando tu cuenta...</p>
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

        {/* Advertencia */}
        <div className="bg-[#fef3c7] border border-[#facc15]/60 rounded-xl p-3 text-xs text-[#854d0e]">
          <p className="font-semibold mb-1">Advertencia importante</p>
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
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              placeholder="Escribe tu contraseña para confirmar"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              name="confirm"
              className="mt-[2px]"
              required
            />
            <span>
              Confirmo que deseo desactivar mi cuenta y entiendo que se
              eliminará de forma permanente tras el periodo de gracia de 6
              meses.
            </span>
          </label>

          {errorMsg && (
            <div className="text-xs text-red-600 whitespace-pre-line">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-700 whitespace-pre-line">
              {successMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 rounded-lg border border-gray-300 text-gray-700 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium py-2 text-sm disabled:opacity-60"
            >
              {submitting ? "Procesando..." : "Solicitar eliminación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}