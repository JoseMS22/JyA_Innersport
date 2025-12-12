// frontend/app/account/addresses/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { apiFetch } from "@/lib/api";
import { useNotifications } from "@/app/context/NotificationContext";

type Direccion = {
  id: number;
  nombre: string | null;
  pais: string;
  provincia: string;
  canton: string;
  distrito: string;
  detalle: string;
  codigo_postal: string | null;
  telefono: string | null;
  referencia: string | null;
  predeterminada: boolean;
  activa: boolean;
  created_at: string;
  updated_at: string | null;
};

type DireccionForm = {
  nombre: string;
  pais: string;
  provincia: string;
  canton: string;
  distrito: string;
  detalle: string;
  codigo_postal: string;
  telefono: string;
  referencia: string;
  predeterminada: boolean;
};

const PROVINCIAS = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];

export default function AddressesPage() {
  const router = useRouter();
  const { success, error: showError, confirm } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);

  // Modo edición/creación
  const [editando, setEditando] = useState<number | "nueva" | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [form, setForm] = useState<DireccionForm>({
    nombre: "",
    pais: "Costa Rica",
    provincia: "",
    canton: "",
    distrito: "",
    detalle: "",
    codigo_postal: "",
    telefono: "",
    referencia: "",
    predeterminada: false,
  });

  // Cargar direcciones
  useEffect(() => {
    loadDirecciones();
  }, []);

  async function loadDirecciones() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/v1/direcciones/");
      setDirecciones(data);
    } catch (err: any) {
      showError(
        "Error al cargar",
        err?.message || "No se pudieron cargar las direcciones"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function iniciarNueva() {
    setForm({
      nombre: "",
      pais: "Costa Rica",
      provincia: "",
      canton: "",
      distrito: "",
      detalle: "",
      codigo_postal: "",
      telefono: "",
      referencia: "",
      predeterminada: false,
    });
    setEditando("nueva");
  }

  function iniciarEdicion(direccion: Direccion) {
    setForm({
      nombre: direccion.nombre || "",
      pais: direccion.pais,
      provincia: direccion.provincia,
      canton: direccion.canton,
      distrito: direccion.distrito,
      detalle: direccion.detalle,
      codigo_postal: direccion.codigo_postal || "",
      telefono: direccion.telefono || "",
      referencia: direccion.referencia || "",
      predeterminada: direccion.predeterminada,
    });
    setEditando(direccion.id);
  }

  function cancelarEdicion() {
    setEditando(null);
    setForm({
      nombre: "",
      pais: "Costa Rica",
      provincia: "",
      canton: "",
      distrito: "",
      detalle: "",
      codigo_postal: "",
      telefono: "",
      referencia: "",
      predeterminada: false,
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);

    try {
      if (editando === "nueva") {
        // Crear nueva
        await apiFetch("/api/v1/direcciones/", {
          method: "POST",
          body: JSON.stringify(form),
        });
        success("Dirección creada", "La dirección se ha guardado correctamente");
      } else if (typeof editando === "number") {
        // Actualizar existente
        await apiFetch(`/api/v1/direcciones/${editando}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        success("Dirección actualizada", "Los cambios se han guardado correctamente");
      }

      setEditando(null);
      await loadDirecciones();
    } catch (err: any) {
      showError(
        "Error al guardar",
        err?.message || "No se pudo guardar la dirección"
      );
    } finally {
      setGuardando(false);
    }
  }

  async function marcarPredeterminada(id: number) {
    try {
      await apiFetch(`/api/v1/direcciones/${id}/predeterminada`, {
        method: "PATCH",
      });
      success("Dirección actualizada", "Se ha marcado como predeterminada");
      await loadDirecciones();
    } catch (err: any) {
      showError(
        "Error al actualizar",
        err?.message || "No se pudo actualizar la dirección predeterminada"
      );
    }
  }

  function eliminarDireccion(id: number) {
    confirm(
      "Eliminar dirección",
      "¿Estás seguro de que deseas eliminar esta dirección? Esta acción no se puede deshacer.",
      async () => {
        try {
          await apiFetch(`/api/v1/direcciones/${id}`, {
            method: "DELETE",
          });
          success("Dirección eliminada", "La dirección se ha eliminado correctamente");
          await loadDirecciones();
        } catch (err: any) {
          showError(
            "Error al eliminar",
            err?.message || "No se pudo eliminar la dirección"
          );
        }
      },
      "Eliminar"
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <main className="max-w-4xl mx-auto px-4 py-10 pt-[140px]">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-600">Cargando direcciones...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      <MainMenu />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-11 pt-[140px]">
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

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#6b21a8] mb-1">
              Mis direcciones
            </h1>
            <p className="text-xs text-gray-500">
              Gestiona las direcciones de entrega para tus pedidos
            </p>
          </div>

          {!editando && (
            <button
              onClick={iniciarNueva}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-purple-500/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva dirección
            </button>
          )}
        </div>

        {/* Formulario de edición/creación */}
        {editando && (
          <div className="bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/20 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#6b21a8]">
                {editando === "nueva" ? "Nueva dirección" : "Editar dirección"}
              </h2>
              <button
                onClick={cancelarEdicion}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Nombre de la dirección */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Nombre de la dirección
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Casa, Trabajo, Casa de mamá"
                  className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Opcional - Te ayuda a identificar esta dirección
                </p>
              </div>

              {/* País */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">País *</label>
                <input
                  type="text"
                  name="pais"
                  value={form.pais}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] bg-gray-50 text-gray-800"
                  readOnly
                />
              </div>

              {/* Provincia, Cantón, Distrito */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Provincia *
                  </label>
                  <select
                    name="provincia"
                    value={form.provincia}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                  >
                    <option value="">Seleccionar</option>
                    {PROVINCIAS.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Cantón *
                  </label>
                  <input
                    type="text"
                    name="canton"
                    value={form.canton}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Distrito *
                  </label>
                  <input
                    type="text"
                    name="distrito"
                    value={form.distrito}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                  />
                </div>
              </div>

              {/* Dirección exacta */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Dirección exacta *
                </label>
                <textarea
                  name="detalle"
                  value={form.detalle}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Ej: De la escuela 200m norte, casa amarilla, portón negro"
                  className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800 resize-none"
                />
              </div>

              {/* Código postal y teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Código postal
                  </label>
                  <input
                    type="text"
                    name="codigo_postal"
                    value={form.codigo_postal}
                    onChange={handleChange}
                    className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Teléfono de contacto
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                  />
                </div>
              </div>

              {/* Referencias */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Referencias adicionales
                </label>
                <input
                  type="text"
                  name="referencia"
                  value={form.referencia}
                  onChange={handleChange}
                  placeholder="Ej: Casa de dos pisos frente al parque"
                  className="w-full rounded-lg border px-3 py-2 outline-none border-[#e5e7eb] focus:border-[#a855f7] text-gray-800"
                />
              </div>

              {/* Predeterminada */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="predeterminada"
                  id="predeterminada"
                  checked={form.predeterminada}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-[#a855f7] focus:ring-[#a855f7]"
                />
                <label htmlFor="predeterminada" className="text-sm text-gray-700 cursor-pointer">
                  Marcar como dirección predeterminada
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="flex-1 rounded-lg border-2 border-gray-300 text-gray-700 py-2 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-semibold py-2 text-sm disabled:opacity-60 shadow-lg shadow-purple-500/30 transition-all"
                >
                  {guardando ? "Guardando..." : "Guardar dirección"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de direcciones */}
        {!editando && (
          <div className="space-y-4">
            {direcciones.length === 0 ? (
              <div className="bg-white/90 rounded-2xl border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">📍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No tienes direcciones guardadas
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Agrega tu primera dirección para facilitar tus compras
                </p>
                <button
                  onClick={iniciarNueva}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar dirección
                </button>
              </div>
            ) : (
              direcciones.map((direccion) => (
                <div
                  key={direccion.id}
                  className="bg-white/90 rounded-2xl shadow border border-gray-200 p-6 hover:border-[#a855f7]/40 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* Nombre y badges */}
                      <div className="flex items-center gap-2 mb-2">
                        {direccion.nombre && (
                          <h3 className="text-base font-semibold text-gray-900">
                            {direccion.nombre}
                          </h3>
                        )}
                        {direccion.predeterminada && (
                          <span className="px-2 py-1 bg-[#22c55e] !text-white text-[10px] rounded-full font-semibold">
                            PREDETERMINADA
                          </span>
                        )}
                      </div>

                      {/* Dirección */}
                      <p className="text-sm text-gray-700 mb-1">
                        {direccion.detalle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {direccion.distrito}, {direccion.canton},{" "}
                        {direccion.provincia}
                      </p>
                      {direccion.codigo_postal && (
                        <p className="text-xs text-gray-500">
                          Código postal: {direccion.codigo_postal}
                        </p>
                      )}
                      {direccion.telefono && (
                        <p className="text-xs text-gray-500">
                          📞 {direccion.telefono}
                        </p>
                      )}
                      {direccion.referencia && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {direccion.referencia}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {!direccion.predeterminada && (
                      <button
                        onClick={() => marcarPredeterminada(direccion.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 font-medium transition-colors"
                      >
                        Marcar predeterminada
                      </button>
                    )}
                    <button
                      onClick={() => iniciarEdicion(direccion)}
                      className="text-xs px-3 py-1.5 rounded-lg border-2 border-[#a855f7] text-[#a855f7] hover:bg-[#a855f7] hover:text-white font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarDireccion(direccion.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-medium transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Info adicional */}
        {!editando && direcciones.length > 0 && (
          <div className="mt-6 p-4 bg-white/70 rounded-xl border border-[#e5e7eb]">
            <h3 className="text-sm font-semibold text-[#6b21a8] mb-2">
              💡 Sobre tus direcciones
            </h3>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>
                La dirección predeterminada se usará automáticamente en el checkout
              </li>
              <li>Puedes tener múltiples direcciones y elegir cuál usar en cada pedido</li>
              <li>
                Las direcciones eliminadas no se pueden recuperar, pero puedes
                crearlas de nuevo
              </li>
            </ul>
          </div>
        )}
      </main>

      <RecommendedFooter />
    </div>
  );
}