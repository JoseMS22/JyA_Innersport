// frontend/app/admin/categorias/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api";

type Categoria = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

type CategoriaFormState = {
  nombre: string;
  descripcion: string;
};

const EMPTY_FORM: CategoriaFormState = {
  nombre: "",
  descripcion: "",
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
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
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
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
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
  // Render
  // =========================

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">Categorías</h1>
          <p className="text-xs text-gray-500">
            Gestiona las categorías que organizan tus productos.
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
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
            <span>Activa</span>
            <span className="mx-2 text-gray-300">•</span>
            <span className="w-2 h-2 rounded-full bg-gray-300" />{" "}
            <span>Inactiva</span>
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
  setForm: (f: CategoriaFormState) => void;
  onSubmit: (e: FormEvent) => void;
  saving: boolean;
  actionLabel: string;
};

function CategoriaForm({
  form,
  setForm,
  onSubmit,
  saving,
  actionLabel,
}: CategoriaFormProps) {
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
