// frontend/app/account/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { useNotifications } from "../../context/NotificationContext";
import { apiFetch } from "@/lib/api";

type UserProfile = {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string | null;
  rol: string;
  activo: boolean;
  email_verificado: boolean;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { success, error, info } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Estado del formulario
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
  });

  // ---- Estado para puntos ----
  const [puntosSaldo, setPuntosSaldo] = useState<number | null>(null);
  const [puntosValorAprox, setPuntosValorAprox] = useState<number | null>(null);
  const [cargandoPuntos, setCargandoPuntos] = useState(false);
  // -----------------------------------

  // Cargar perfil al entrar
  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiFetch("/api/v1/auth/me");

        setProfile(data);
        setForm({
          nombre: data.nombre ?? "",
          telefono: data.telefono ?? "",
        });

        // ---- Cargar puntos junto con el perfil ----
        cargarSaldoPuntos();
      } catch (err: any) {
        error(
          "Error al cargar perfil",
          err?.message ?? "No se pudo cargar tu perfil. Intenta iniciar sesión nuevamente."
        );
        setLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para obtener saldo de puntos
  async function cargarSaldoPuntos() {
    try {
      setCargandoPuntos(true);
      const data = await apiFetch("/api/v1/puntos/me/saldo");
      // data: { saldo: number, valor_aproximado: Decimal/string }
      setPuntosSaldo(Number(data.saldo ?? 0));
      // valor_aproximado puede venir como string/number -> convertir a number
      setPuntosValorAprox(
        data.valor_aproximado ? Number(data.valor_aproximado) : 0
      );
    } catch (err) {
      // Si falla la carga de puntos no bloqueamos la vista
      console.error("Error al cargar puntos:", err);
      setPuntosSaldo(null);
      setPuntosValorAprox(null);
    } finally {
      setCargandoPuntos(false);
      setLoading(false); // aseguramos que la pantalla deje el estado loading
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      await apiFetch("/api/v1/auth/me", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      success("Perfil actualizado", "Tus cambios se han guardado correctamente");
    } catch (err: any) {
      error(
        "Error al actualizar",
        err?.message ?? "Ocurrió un error al actualizar tu perfil. Inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-3xl mx-auto px-4 py-10 pt-[140px]">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-600">Cargando tu perfil...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-3xl mx-auto px-4 py-10 pt-[140px]">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-sm text-red-600 mb-4">
              No se pudo obtener tu perfil. Asegúrate de haber iniciado sesión.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-semibold rounded-xl"
            >
              Iniciar sesión
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-3xl mx-auto px-4 py-8 pt-[140px]">
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
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Mis direcciones
          </span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#6b21a8] mb-1">Mi cuenta</h1>
          <p className="text-xs text-gray-500">
            Gestiona tu información personal y preferencias
          </p>
        </div>

        {/* Grid de tarjetas */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Tarjeta: Información personal (ocupa 2 columnas en md) */}
          <div className="md:col-span-2 bg-white/90 rounded-2xl shadow border border-[#e5e7eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#f3e8ff] flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Información personal
                </h2>
                <p className="text-xs text-gray-500">Nombre y datos de contacto</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Nombre */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2 outline-none 
                             border-[#e5e7eb] focus:border-[#a855f7]
                             text-gray-800 placeholder-gray-400"
                  required
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  maxLength={20}
                  className="w-full rounded-lg border px-3 py-2 outline-none
                             border-[#e5e7eb] focus:border-[#a855f7]
                             text-gray-800 placeholder-gray-400"
                />
              </div>

              {/* Correo (solo lectura) */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Correo electrónico</label>
                <input
                  value={profile.correo}
                  readOnly
                  className="w-full rounded-lg border px-3 py-2 bg-gray-50 
                             text-gray-500 cursor-not-allowed border-[#e5e7eb]"
                />
                <div className="flex items-center gap-2 mt-2">
                  {profile.email_verificado ? (
                    <>
                      <span className="text-emerald-600 text-xs">✓</span>
                      <span className="text-xs text-emerald-600">Correo verificado</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 text-xs">⚠</span>
                      <span className="text-xs text-amber-600">Correo pendiente de verificación</span>
                    </>
                  )}
                </div>
              </div>

              {/* Botón guardar */}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-medium px-4 py-2 text-sm disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </div>

          {/* Tarjeta: Direcciones (ahora ocupa 1 columna en md) */}
          <div className="bg-white/90 rounded-2xl shadow border border-[#e5e7eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#fef3c7] flex items-center justify-center text-2xl">
                📍
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Mis direcciones</h2>
                <p className="text-xs text-gray-500">Gestiona tus direcciones de envío</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Administra las direcciones donde recibirás tus pedidos. Puedes tener varias direcciones y elegir cuál usar en cada compra.
            </p>

            <button
              onClick={() => router.push("/account/addresses")}
              className="w-full rounded-lg border-2 border-[#a855f7] text-[#a855f7] hover:bg-[#f3e8ff] font-medium px-4 py-2 text-sm transition-colors"
            >
              Ver mis direcciones →
            </button>
          </div>

          {/* Tarjeta: Puntos */}
          <div className="bg-white/90 rounded-2xl shadow border border-[#e5e7eb] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#eef2ff] flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Mis puntos</h2>
                <p className="text-xs text-gray-500">Saldo y valor aproximado</p>
              </div>
            </div>

            <div className="mb-4">
              {cargandoPuntos ? (
                <div className="text-sm text-gray-500">Cargando puntos...</div>
              ) : puntosSaldo === null ? (
                <div className="text-sm text-gray-500">No se pudo cargar el saldo de puntos</div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-[#6b21a8]">{puntosSaldo.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ ₡{(puntosValorAprox ?? 0).toLocaleString("es-CR")}
                  </p>
                </div>
              )}
            </div>     
          </div>
        </div>

        {/* Sección de acciones importantes */}
        <div className="bg-white/90 rounded-2xl shadow border border-[#e5e7eb] p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Seguridad y configuración</h2>

          <div className="space-y-3">
            {/* Cambiar contraseña */}
            <button
              onClick={() => router.push("/change-password")}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-[#a855f7] hover:bg-[#faf5ff] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f3e8ff] flex items-center justify-center text-xl">🔒</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cambiar contraseña</p>
                  <p className="text-xs text-gray-500">Actualiza tu contraseña para mayor seguridad</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            {/* Eliminar cuenta */}
            <button
              onClick={() => router.push("/account/delete")}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <p className="text-sm font-medium text-red-600">Eliminar mi cuenta</p>
                  <p className="text-xs text-red-500">Eliminar permanentemente tu cuenta y datos</p>
                </div>
              </div>
              <span className="text-red-400">→</span>
            </button>
          </div>
        </div>

        {/* Info de cuenta */}
        <div className="mt-6 p-4 bg-white/70 rounded-xl border border-[#e5e7eb]">
          <h3 className="text-sm font-semibold text-[#6b21a8] mb-2">ℹ️ Información de tu cuenta</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Rol:</span>{" "}
              <span className="uppercase text-[#a855f7]">{profile.rol}</span>
            </p>
            <p>
              <span className="font-medium">Estado:</span>{" "}
              {profile.activo ? <span className="text-emerald-600">✓ Activa</span> : <span className="text-red-600">✗ Inactiva</span>}
            </p>
            <p>
              <span className="font-medium">Miembro desde:</span>{" "}
              {new Date(profile.created_at).toLocaleDateString("es-CR")}
            </p>
          </div>
        </div>
      </main>

      {/* Footer con productos recomendados */}
      <RecommendedFooter />
    </div>
  );
}