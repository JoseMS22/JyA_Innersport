"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/Logo";

function formatRemaining(ms: number | null) {
  if (ms === null || ms <= 0)
    return "El periodo de gracia puede haber finalizado.";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  if (days > 0) return `${days} días, ${hours} horas y ${minutes} minutos`;
  if (hours > 0) return `${hours} horas y ${minutes} minutos`;
  return `${minutes} minutos`;
}

export default function ReactivateAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCorreo = searchParams.get("correo") ?? "";
  const deletionIso = searchParams.get("deletion"); // string | null

  const [correo, setCorreo] = useState(initialCorreo);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [remainingText, setRemainingText] = useState<string>("");

  // ✅ Convertimos string | null → Date | null de forma segura
  const deletionDate = useMemo(() => {
    if (!deletionIso) return null;
    return new Date(deletionIso); // aquí ya es string
  }, [deletionIso]);

  // ⏱️ Countdown
  useEffect(() => {
    if (!deletionDate) {
      setRemainingText("No se encontró la fecha programada de eliminación.");
      return;
    }

    function updateRemaining() {
      const now = new Date();
      if (!deletionDate) {
        setRemainingText("No se encontró la fecha programada de eliminación.");
        return;
      }
      const diff = deletionDate.getTime() - now.getTime();
      setRemainingText(formatRemaining(diff));
    }

    updateRemaining();
    const id = setInterval(updateRemaining, 60_000); // cada minuto
    return () => clearInterval(id);
  }, [deletionDate]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      await apiFetch("/api/v1/auth/reactivate-account", {
        method: "POST",
        body: JSON.stringify({ correo, password }),
      });

      setSuccessMsg("Tu cuenta ha sido reactivada. Redirigiendo a la aplicación...");
      setTimeout(() => router.push("/"), 2000)
    } catch (err: any) {
      setErrorMsg(err.message ?? "No se pudo reactivar la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8 space-y-4">
        {/* Encabezado */}
        <div className="flex flex-col items-center gap-2">
          <Logo size={120} />
          <h1 className="text-xl font-semibold text-[#6b21a8]">
            Reactivar cuenta
          </h1>
          <p className="text-xs text-gray-600 text-center">
            Tu cuenta está en proceso de eliminación. Si deseas seguir usando la
            plataforma, puedes reactivarla antes de que finalice el periodo de gracia.
          </p>
        </div>

        {/* Info de tiempo restante */}
        <div className="bg-[#eef2ff] border border-[#a5b4fc]/60 rounded-xl p-3 text-xs text-[#312e81]">
          <p className="font-semibold mb-1">
            Tiempo restante antes de la eliminación
          </p>
          <p>{remainingText}</p>
          {deletionDate && (
            <p className="mt-1">
              Fecha programada de eliminación:{" "}
              <span className="font-semibold">
                {deletionDate.toLocaleString()}
              </span>
            </p>
          )}
        </div>

        {/* Formulario de reactivación */}
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              name="correo"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              placeholder="Escribe tu contraseña para reactivar la cuenta"
            />
          </div>

          <p className="text-[11px] text-gray-500">
            Al reactivar tu cuenta, se detendrá el proceso de eliminación y podrás
            volver a utilizar todas las funcionalidades normalmente.
          </p>

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
              onClick={() => router.push("/login")}
              className="flex-1 rounded-lg border border-gray-300 text-gray-700 py-2 text-sm hover:bg-gray-50"
            >
              Volver al inicio de sesión
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 !text-white font-medium py-2 text-sm disabled:opacity-60"
            >
              {submitting ? "Procesando..." : "Reactivar cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}