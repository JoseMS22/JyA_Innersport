"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { apiFetch } from "@/lib/api";

type Direccion = {
  provincia: string;
  canton: string;
  distrito: string;
  detalle?: string | null;
  telefono?: string | null;
};

type UserProfile = {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string | null;
  direccion?: Direccion | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Estado del formulario
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    provincia: "",
    canton: "",
    distrito: "",
    detalle: "",
    telefono_direccion: "",
  });

  // Cargar perfil al entrar
  useEffect(() => {
    async function loadProfile() {
      try {
        setErrorMsg(null);
        const data = await apiFetch("/api/v1/auth/me");

        const p: UserProfile = data;

        setProfile(p);
        setForm({
          nombre: p.nombre ?? "",
          telefono: p.telefono ?? "",
          provincia: p.direccion?.provincia ?? "",
          canton: p.direccion?.canton ?? "",
          distrito: p.direccion?.distrito ?? "",
          detalle: p.direccion?.detalle ?? "",
          telefono_direccion: p.direccion?.telefono ?? "",
        });
      } catch (err: any) {
        setErrorMsg(
          err?.message ??
            "No se pudo cargar tu perfil. Intenta iniciar sesión nuevamente."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      await apiFetch("/api/v1/auth/me", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      setSuccessMsg("Perfil actualizado correctamente.");
    } catch (err: any) {
      setErrorMsg(
        err?.message ??
          "Ocurrió un error al actualizar tu perfil. Inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-600">Cargando tu perfil...</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-sm text-red-600">
            No se pudo obtener tu perfil. Asegúrate de haber iniciado sesión.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-[#6b21a8] mb-1">
          Mi perfil
        </h1>
        <p className="text-xs text-gray-500 mb-6">
          Aquí puedes ver y actualizar tu información básica y dirección de
          entrega.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 rounded-2xl shadow border border-[#e5e7eb] p-5 space-y-4 text-sm"
        >
          {/* Datos de cuenta (correo solo lectura) */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Nombre completo
              </label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Correo electrónico
              </label>
              <input
                value={profile.correo}
                readOnly
                className="w-full rounded-lg border px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed border-[#e5e7eb]"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                El correo no puede modificarse desde aquí.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Teléfono
              </label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              />
            </div>
          </div>

          <hr className="my-2" />

          {/* Dirección */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase">
            Dirección de entrega
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Provincia
              </label>
              <input
                name="provincia"
                value={form.provincia}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Cantón
              </label>
              <input
                name="canton"
                value={form.canton}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Distrito
              </label>
              <input
                name="distrito"
                value={form.distrito}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Teléfono de entrega
              </label>
              <input
                name="telefono_direccion"
                value={form.telefono_direccion}
                onChange={handleChange}
                maxLength={20}
                className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Detalles de dirección
            </label>
            <textarea
              name="detalle"
              value={form.detalle}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7]"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-600 whitespace-pre-line">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-700">{successMsg}</div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium px-4 py-2 text-xs disabled:opacity-60"
            >
              {saving ? "Guardando cambios..." : "Guardar cambios"}
            </button>

            <div className="flex gap-2">
              {/* 🆕 Botón Cambiar contraseña */}
              <button
                type="button"
                onClick={() => router.push("/change-password")}
                className="rounded-lg bg-[#6b21a8] hover:bg-[#7e22ce] text-white font-medium px-4 py-2 text-xs"
              >
                Cambiar contraseña
              </button>

              <button
                type="button"
                onClick={() => router.push("/account/delete")}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 text-xs"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}