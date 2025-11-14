// frontend/app/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../../components/Logo";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const form = e.currentTarget; // 👈 guardar referencia AQUÍ

    const formData = new FormData(e.currentTarget);
    const payload = {
      nombre: formData.get("nombre") as string,
      correo: formData.get("correo") as string,
      telefono: formData.get("telefono") as string,
      password: formData.get("password") as string,
      confirm_password: formData.get("confirm_password") as string,
      provincia: formData.get("provincia") as string,
      canton: formData.get("canton") as string,
      distrito: formData.get("distrito") as string,
      detalle: formData.get("detalle") as string,
      telefono_direccion: formData.get("telefono_direccion") as string,
    };

    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg(
        "Cuenta creada. Revisa tu correo y haz clic en el enlace de verificación."
      );
      // ✅ usar la referencia guardada, no e.currentTarget
      form.reset();
    } catch (err: any) {
      setErrorMsg(err.message ?? "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8 grid md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center justify-center">
          <Logo size={160} />
          <p className="mt-4 text-sm text-center text-[#6b21a8]">
            Crea tu cuenta para empezar a gestionar tus
            compras en{" "}
            <span className="font-semibold text-[#a855f7]">
              JYA Innersport
            </span>
            .
          </p>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-[#6b21a8] mb-4">
            Crear cuenta
          </h1>

          <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
            <input
              name="nombre"
              placeholder="Nombre completo"
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              required
            />
            <input
              type="email"
              name="correo"
              placeholder="Correo electrónico"
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              required
            />
            <input
              name="telefono"
              placeholder="Teléfono"
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
                required
              />
              <input
                type="password"
                name="confirm_password"
                placeholder="Confirmar contraseña"
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                name="provincia"
                placeholder="Provincia"
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
                required
              />
              <input
                name="canton"
                placeholder="Cantón"
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                name="distrito"
                placeholder="Distrito"
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
                required
              />
              <input
                name="telefono_direccion"
                placeholder="Teléfono de entrega"
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              />
            </div>

            <textarea
              name="detalle"
              placeholder="Detalles de dirección"
              rows={2}
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
            />

            {errorMsg && (
              <div className="text-xs text-red-600 whitespace-pre-line">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="text-xs text-emerald-700">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2 text-sm disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Crear cuenta"}
            </button>

            <p className="mt-2 text-xs text-center text-[#6b21a8]">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-[#eab308] hover:underline"
              >
                Iniciar sesión
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
