// frontend/app/verify-email/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Logo } from "../../components/Logo";
import { apiFetch } from "@/lib/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "checking" | "success" | "error" | "missing"
  >("checking");
  const [message, setMessage] = useState<string>("Verificando tu correo...");

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      setMessage("No se encontró el token de verificación en la URL.");
      return;
    }

    async function verify() {
      try {
        const data = await apiFetch("/api/v1/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setStatus("success");
        setMessage(
          data?.message ??
            "Correo verificado correctamente. Ya puedes iniciar sesión."
        );
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message ?? "Error al verificar el correo.");
      }
    }

    verify();
  }, [token]);

  const isSuccess = status === "success";
  const isError = status === "error" || status === "missing";

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8 flex flex-col items-center text-center gap-4">
        <Logo size={160} />

        <h1 className="text-xl font-semibold text-[#6b21a8]">
          Verificación de correo
        </h1>

        <p
          className={`text-sm ${
            isSuccess
              ? "text-emerald-700"
              : isError
              ? "text-red-600"
              : "text-[#6b21a8]"
          }`}
        >
          {message}
        </p>

        <button
          onClick={() => router.push("/login")}
          className="mt-2 rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium px-4 py-2 text-sm"
        >
          Ir a iniciar sesión
        </button>
      </div>
    </div>
  );
}
