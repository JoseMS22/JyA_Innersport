// frontend/app/admin/categorias/page.tsx
"use client";

import { useEffect, useState, FormEvent, Dispatch, SetStateAction } from "react";
import { apiFetch } from "@/lib/api";

type CategoriaLite = {
  id: number;
  nombre: string;
};

type Categoria = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  principal: boolean;
  secundaria: boolean;
  principales: CategoriaLite[];
  secundarias: CategoriaLite[];
};

type CategoriaFormState = {
  nombre: string;
  descripcion: string;
  principal: boolean;
  secundaria: boolean;
  principales_ids: number[];
};

const EMPTY_FORM: CategoriaFormState = {
  nombre: "",
  descripcion: "",
  principal: false,
  secundaria: false,
  principales_ids: [],
};

type ConfirmMode = "activar" | "desactivar" | null;

export default function AdminCategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<CategoriaFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Estados para confirmación bonita
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [confirmCategoria, setConfirmCategoria] = useState<Categoria | null>(
    null
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  // =========================
  // Cargar categorías
  // =========================
  async function loadCategorias() {
    try {
      setLoading(true);
      setError(null);

      const data = (await apiFetch("/api/v1/categorias", {
        method: "GET",
      })) as Categoria[];

      setCategorias(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategorias();
  }, []);

  // =========================
  // Abrir / cerrar modales
  // =========================

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsCreateOpen(true);
  }

  function openEditModal(categoria: Categoria) {
    setForm({
      nombre: categoria.nombre ?? "",
      descripcion: categoria.descripcion ?? "",
      principal: categoria.principal,
      secundaria: categoria.secundaria,
      principales_ids: (categoria.principales || []).map((p) => p.id),
    });
    setEditingId(categoria.id);
    setIsEditOpen(true);
  }

  function closeModals() {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  // =========================
  // Handlers CRUD
  // =========================

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Validación: si es secundaria, debe tener al menos una principal
      if (form.secundaria && form.principales_ids.length === 0) {
        setError(
          "Una categoría secundaria debe tener al menos una categoría principal asociada."
        );
        setSaving(false);
        return;
      }

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        principal: form.principal,
        secundaria: form.secundaria,
        principales_ids: form.secundaria ? form.principales_ids : [],
      };

      await apiFetch("/api/v1/categorias", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      closeModals();
      await loadCategorias();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al crear la categoría");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    setSaving(true);
    setError(null);

    try {
      // Validación: si es secundaria, debe tener al menos una principal
      if (form.secundaria && form.principales_ids.length === 0) {
        setError(
          "Una categoría secundaria debe tener al menos una categoría principal asociada."
        );
        setSaving(false);
        return;
      }

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        principal: form.principal,
        secundaria: form.secundaria,
        principales_ids: form.secundaria ? form.principales_ids : [],
      };

      await apiFetch(`/api/v1/categorias/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      closeModals();
      await loadCategorias();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al actualizar la categoría");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // Activar / desactivar con modal bonito
  // =========================

  function openConfirmDesactivar(categoria: Categoria) {
    setConfirmCategoria(categoria);
    setConfirmMode("desactivar");
  }

  function openConfirmActivar(categoria: Categoria) {
    setConfirmCategoria(categoria);
    setConfirmMode("activar");
  }

  function closeConfirm() {
    setConfirmMode(null);
    setConfirmCategoria(null);
    setConfirmLoading(false);
  }

  async function handleConfirmAction() {
    if (!confirmCategoria || !confirmMode) return;

    try {
      setConfirmLoading(true);
      setError(null);

      if (confirmMode === "desactivar") {
        await apiFetch(`/api/v1/categorias/${confirmCategoria.id}/desactivar`, {
          method: "PATCH",
        });
      } else {
        await apiFetch(`/api/v1/categorias/${confirmCategoria.id}/activar`, {
          method: "PATCH",
        });
      }

      await loadCategorias();
      closeConfirm();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ??
          (confirmMode === "desactivar"
            ? "Error al desactivar la categoría"
            : "Error al activar la categoría")
      );
      setConfirmLoading(false);
    }
  }

  // =========================
  // Helpers visuales
  // =========================

  function getTipoLabel(cat: Categoria) {
    if (cat.principal && !cat.secundaria) return "Principal";
    if (cat.secundaria && !cat.principal) return "Secundaria";
    if (!cat.principal && !cat.secundaria) return "General";
    return "Indefinido";
  }

  function getRelacionLabel(cat: Categoria) {
    if (cat.secundaria && cat.principales.length > 0) {
      return `Depende de: ${cat.principales.map((p) => p.nombre).join(", ")}`;
    }
    if (cat.principal && cat.secundarias.length > 0) {
      return `Tiene ${cat.secundarias.length} subcategoría(s)`;
    }
    return "—";
  }

  // =========================
  // Render
  // =========================

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">Categorías</h1>
          <p className="text-xs text-gray-500">
            Gestiona las categorías que organizan tus productos, marcando
            cuáles son principales y cuáles son subcategorías.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="text-xs px-3 py-1.5 rounded-full bg-[#a855f7] text-white font-semibold hover:bg-[#7e22ce] shadow-sm"
        >
          + Nueva categoría
        </button>
      </header>

      {/* Panel principal */}
      <section className="rounded-2xl bg-white/95 border border-[#e5e7eb] p-4 shadow-sm">
        {/* Barra superior: filtro / leyenda */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Activa</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span>Inactiva</span>
            </div>
            <span className="mx-2 text-gray-300 hidden sm:inline">•</span>
            <div className="flex items-center gap-1">
              <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Principal
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                Secundaria
              </span>
            </div>
          </div>
        </div>

        {/* Errores */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        )}

        {/* Lista / tabla */}
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-500">
            Cargando categorías...
          </div>
        ) : categorias.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            Aún no hay categorías creadas.{" "}
            <button
              className="text-[#6b21a8] font-semibold hover:text-[#a855f7]"
              onClick={openCreateModal}
            >
              Crea la primera categoría
            </button>
            .
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-[11px] text-gray-500">
                  <th className="px-3 py-2 text-left font-semibold">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Nombre
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Relación
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Descripción
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    {/* Estado */}
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cat.activo ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            cat.activo
                              ? "text-emerald-600"
                              : "text-gray-400 line-through"
                          }
                        >
                          {cat.activo ? "Activa" : "Inactiva"}
                        </span>
                      </span>
                    </td>

                    {/* Nombre */}
                    <td className="px-3 py-2">
                      <span className="font-semibold text-gray-800">
                        {cat.nombre}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        {cat.principal && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            Principal
                          </span>
                        )}
                        {cat.secundaria && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                            Secundaria
                          </span>
                        )}
                        {!cat.principal && !cat.secundaria && (
                          <span className="text-gray-400">General</span>
                        )}
                      </span>
                    </td>

                    {/* Relación */}
                    <td className="px-3 py-2 text-gray-600 text-[11px]">
                      {getRelacionLabel(cat)}
                    </td>

                    {/* Descripción */}
                    <td className="px-3 py-2 text-gray-600">
                      {cat.descripcion ? (
                        <span>{cat.descripcion}</span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">
                          Sin descripción
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="px-2 py-1 rounded-full bg-amber-50 text-[11px] text-amber-700 hover:bg-amber-100 border border-amber-100"
                        >
                          Editar
                        </button>
                        {cat.activo ? (
                          <button
                            onClick={() => openConfirmDesactivar(cat)}
                            className="px-2 py-1 rounded-full bg-red-50 text-[11px] text-red-700 hover:bg-red-100 border border-red-100"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => openConfirmActivar(cat)}
                            className="px-2 py-1 rounded-full bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Crear */}
      {isCreateOpen && (
        <ModalWrapper onClose={closeModals} title="Nueva categoría">
          <CategoriaForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            saving={saving}
            actionLabel="Crear categoría"
            categorias={categorias}
            currentId={null}
          />
        </ModalWrapper>
      )}

      {/* Modal Editar */}
      {isEditOpen && editingId && (
        <ModalWrapper onClose={closeModals} title="Editar categoría">
          <CategoriaForm
            form={form}
            setForm={setForm}
            onSubmit={handleUpdate}
            saving={saving}
            actionLabel="Guardar cambios"
            categorias={categorias}
            currentId={editingId}
          />
        </ModalWrapper>
      )}

      {/* Modal de confirmación activar / desactivar */}
      {confirmMode && confirmCategoria && (
        <ConfirmModal
          mode={confirmMode}
          categoria={confirmCategoria}
          loading={confirmLoading}
          onCancel={closeConfirm}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}

// =========================
// Componentes auxiliares
// =========================

type ModalWrapperProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

function ModalWrapper({ title, children, onClose }: ModalWrapperProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type CategoriaFormProps = {
  form: CategoriaFormState;
  setForm: Dispatch<SetStateAction<CategoriaFormState>>;
  onSubmit: (e: FormEvent) => void;
  saving: boolean;
  actionLabel: string;
  categorias: Categoria[];
  currentId: number | null;
};


function CategoriaForm({
  form,
  setForm,
  onSubmit,
  saving,
  actionLabel,
  categorias,
  currentId,
}: CategoriaFormProps) {
  const posiblesPrincipales = categorias.filter(
    (c) =>
      c.activo &&
      c.principal &&
      (currentId === null || c.id !== currentId)
  );

  function togglePrincipal(checked: boolean) {
    if (checked) {
      // Si marcamos como principal, desmarcamos secundaria
      setForm({
        ...form,
        principal: true,
        secundaria: false,
        principales_ids: [],
      });
    } else {
      setForm({
        ...form,
        principal: false,
      });
    }
  }

  function toggleSecundaria(checked: boolean) {
    if (checked) {
      // Si marcamos como secundaria, desmarcamos principal
      setForm({
        ...form,
        secundaria: true,
        principal: false,
      });
    } else {
      setForm({
        ...form,
        secundaria: false,
        principales_ids: [],
      });
    }
  }

  function togglePrincipalAsociada(id: number) {
    setForm((prev) => {
      const exists = prev.principales_ids.includes(id);
      return {
        ...prev,
        principales_ids: exists
          ? prev.principales_ids.filter((p) => p !== id)
          : [...prev.principales_ids, id],
      };
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-xs">
      <div>
        <label className="block mb-1 font-medium text-gray-700">
          Nombre de la categoría
        </label>
        <input
          type="text"
          required
          maxLength={120}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7]"
          placeholder="Ej. Ropa deportiva"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          rows={3}
          value={form.descripcion}
          onChange={(e) =>
            setForm({ ...form, descripcion: e.target.value })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7] resize-none"
          placeholder="Ej. Categoría para todas las prendas deportivas..."
        />
      </div>

      {/* Tipo de categoría */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
        <p className="font-medium text-gray-700 text-[11px]">
          Tipo de categoría
        </p>
        <p className="text-[11px] text-gray-500">
          Puedes marcarla como <span className="font-semibold">principal</span>{" "}
          (nivel superior) o como{" "}
          <span className="font-semibold">secundaria</span> (subcategoría de
          una o varias principales). También puede ser general (ninguna de las
          dos).
        </p>

        <div className="flex flex-wrap gap-3 mt-1">
          <label className="inline-flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={form.principal}
              onChange={(e) => togglePrincipal(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Principal
            </span>
          </label>

          <label className="inline-flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={form.secundaria}
              onChange={(e) => toggleSecundaria(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
              Secundaria
            </span>
          </label>
        </div>

        {form.principal && form.secundaria && (
          <p className="text-[11px] text-red-600 mt-1">
            Una categoría no puede ser principal y secundaria al mismo tiempo.
          </p>
        )}
      </div>

      {/* Selección de principales si es secundaria */}
      {form.secundaria && (
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-3 space-y-2">
          <p className="font-medium text-violet-800 text-[11px]">
            Asociar con categorías principales
          </p>
          {posiblesPrincipales.length === 0 ? (
            <p className="text-[11px] text-violet-700">
              No hay categorías principales activas disponibles. Primero crea
              una categoría marcada como principal.
            </p>
          ) : (
            <>
              <p className="text-[11px] text-violet-700">
                Selecciona una o varias categorías principales de las que
                depende esta subcategoría.
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {posiblesPrincipales.map((c) => {
                  const active = form.principales_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePrincipalAsociada(c.id)}
                      className={`px-3 py-1 rounded-full border text-[11px] transition-colors ${
                        active
                          ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                          : "bg-white border-violet-200 text-violet-800 hover:bg-violet-100"
                      }`}
                    >
                      {c.nombre}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="pt-2 flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded-full bg-[#a855f7] text-white font-semibold text-xs hover:bg-[#7e22ce] disabled:opacity-60"
        >
          {saving ? "Guardando..." : actionLabel}
        </button>
      </div>
    </form>
  );
}

// =========================
// Modal de confirmación
// =========================

type ConfirmModalProps = {
  mode: "activar" | "desactivar";
  categoria: Categoria;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmModal({
  mode,
  categoria,
  loading,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const isDesactivar = mode === "desactivar";

  const title = isDesactivar
    ? "Desactivar categoría"
    : "Activar categoría";

  const description = isDesactivar
    ? "Los productos asociados podrán seguir existiendo, pero esta categoría no estará disponible para clasificar nuevos productos hasta que la vuelvas a activar."
    : "La categoría volverá a estar disponible para clasificar productos y aparecerá como opción al crear/editar productos.";

  const mainColor = isDesactivar ? "text-red-600" : "text-emerald-600";
  const bgPill = isDesactivar ? "bg-red-50" : "bg-emerald-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-xl p-5 text-xs space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${bgPill} ${mainColor}`}
          >
            {isDesactivar ? "!" : "✓"}
          </span>
          {title}
        </h2>

        <div className="space-y-1">
          <p className="text-gray-800">
            <span className="font-semibold">{categoria.nombre}</span>
          </p>
          <p className="text-gray-500 text-[11px]">{description}</p>
        </div>

        <div className="pt-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold text-white ${
              isDesactivar
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } disabled:opacity-60`}
          >
            {loading
              ? isDesactivar
                ? "Desactivando..."
                : "Activando..."
              : isDesactivar
              ? "Sí, desactivar"
              : "Sí, activar"}
          </button>
        </div>
      </div>
    </div>
  );
}
