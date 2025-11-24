// frontend/app/admin/sucursales/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Sucursal = {
  id: number;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
  created_at?: string;
};

type SucursalFormState = {
  nombre: string;
  direccion: string;
  telefono: string;
};

const EMPTY_FORM: SucursalFormState = {
  nombre: "",
  direccion: "",
  telefono: "",
};

type ConfirmMode = "activar" | "desactivar" | null;

export default function AdminSucursalesPage() {
  const router = useRouter();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<SucursalFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 🔔 Estados para confirmación bonita
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [confirmSucursal, setConfirmSucursal] = useState<Sucursal | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // =========================
  // Cargar sucursales
  // =========================
  async function loadSucursales() {
    try {
      setLoading(true);
      setError(null);

      const data = (await apiFetch("/api/v1/sucursales", {
        method: "GET",
      })) as Sucursal[];

      setSucursales(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cargar sucursales");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSucursales();
  }, []);

  // =========================
  // Abrir / cerrar modales
  // =========================

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsCreateOpen(true);
  }

  function openEditModal(sucursal: Sucursal) {
    setForm({
      nombre: sucursal.nombre ?? "",
      direccion: sucursal.direccion ?? "",
      telefono: sucursal.telefono ?? "",
    });
    setEditingId(sucursal.id);
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
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
      };

      await apiFetch("/api/v1/sucursales", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      closeModals();
      await loadSucursales();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al crear la sucursal");
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
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
      };

      await apiFetch(`/api/v1/sucursales/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      closeModals();
      await loadSucursales();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al actualizar la sucursal");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // Activar / desactivar con modal bonito
  // =========================

  function openConfirmDesactivar(sucursal: Sucursal) {
    setConfirmSucursal(sucursal);
    setConfirmMode("desactivar");
  }

  function openConfirmActivar(sucursal: Sucursal) {
    setConfirmSucursal(sucursal);
    setConfirmMode("activar");
  }

  function closeConfirm() {
    setConfirmMode(null);
    setConfirmSucursal(null);
    setConfirmLoading(false);
  }

  async function handleConfirmAction() {
    if (!confirmSucursal || !confirmMode) return;

    try {
      setConfirmLoading(true);
      setError(null);

      if (confirmMode === "desactivar") {
        await apiFetch(`/api/v1/sucursales/${confirmSucursal.id}/desactivar`, {
          method: "PATCH",
        });
      } else {
        await apiFetch(`/api/v1/sucursales/${confirmSucursal.id}/activar`, {
          method: "PATCH",
        });
      }

      await loadSucursales();
      closeConfirm();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ??
          (confirmMode === "desactivar"
            ? "Error al desactivar la sucursal"
            : "Error al activar la sucursal")
      );
      setConfirmLoading(false);
    }
  }

  // =========================
  // Navegar a inventario de sucursal
  // =========================
  function handleVerInventario(id: number) {
    router.push(`/admin/sucursales/${id}/inventario`);
  }

  // =========================
  // Render
  // =========================

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">Sucursales</h1>
          <p className="text-xs text-gray-500">
            Crear y editar sucursales donde se controla el inventario.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="text-xs px-3 py-1.5 rounded-full bg-[#a855f7] text-white font-semibold hover:bg-[#7e22ce] shadow-sm"
        >
          + Nueva sucursal
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
            Cargando sucursales...
          </div>
        ) : sucursales.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            Aún no hay sucursales creadas.{" "}
            <button
              className="text-[#6b21a8] font-semibold hover:text-[#a855f7]"
              onClick={openCreateModal}
            >
              Crea la primera sucursal
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
                  <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">
                    Dirección
                  </th>
                  <th className="px-3 py-2 text-left font-semibold hidden md:table-cell">
                    Teléfono
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {sucursales.map((suc) => (
                  <tr
                    key={suc.id}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    {/* Estado */}
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            suc.activo ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        <span
                          className={
                            suc.activo
                              ? "text-emerald-600"
                              : "text-gray-400 line-through"
                          }
                        >
                          {suc.activo ? "Activa" : "Inactiva"}
                        </span>
                      </span>
                    </td>

                    {/* Nombre */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                          {suc.nombre}
                        </span>
                        <span className="text-[11px] text-gray-400 md:hidden">
                          {suc.direccion || "Sin dirección registrada"}
                        </span>
                      </div>
                    </td>

                    {/* Dirección */}
                    <td className="px-3 py-2 hidden sm:table-cell text-gray-600">
                      {suc.direccion || (
                        <span className="text-gray-400 text-[11px]">
                          Sin dirección registrada
                        </span>
                      )}
                    </td>

                    {/* Teléfono */}
                    <td className="px-3 py-2 hidden md:table-cell text-gray-600">
                      {suc.telefono || (
                        <span className="text-gray-400 text-[11px]">
                          Sin teléfono
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => handleVerInventario(suc.id)}
                          className="px-2 py-1 rounded-full bg-sky-50 text-[11px] text-sky-700 hover:bg-sky-100 border border-sky-100"
                        >
                          Ver inventario
                        </button>
                        <button
                          onClick={() => openEditModal(suc)}
                          className="px-2 py-1 rounded-full bg-amber-50 text-[11px] text-amber-700 hover:bg-amber-100 border border-amber-100"
                        >
                          Editar
                        </button>
                        {suc.activo ? (
                          <button
                            onClick={() => openConfirmDesactivar(suc)}
                            className="px-2 py-1 rounded-full bg-red-50 text-[11px] text-red-700 hover:bg-red-100 border border-red-100"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => openConfirmActivar(suc)}
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
        <ModalWrapper onClose={closeModals} title="Nueva sucursal">
          <SucursalForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            saving={saving}
            actionLabel="Crear sucursal"
          />
        </ModalWrapper>
      )}

      {/* Modal Editar */}
      {isEditOpen && editingId && (
        <ModalWrapper onClose={closeModals} title="Editar sucursal">
          <SucursalForm
            form={form}
            setForm={setForm}
            onSubmit={handleUpdate}
            saving={saving}
            actionLabel="Guardar cambios"
          />
        </ModalWrapper>
      )}

      {/* Modal de confirmación activar / desactivar */}
      {confirmMode && confirmSucursal && (
        <ConfirmModal
          mode={confirmMode}
          sucursal={confirmSucursal}
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

type SucursalFormProps = {
  form: SucursalFormState;
  setForm: (f: SucursalFormState) => void;
  onSubmit: (e: FormEvent) => void;
  saving: boolean;
  actionLabel: string;
};

function SucursalForm({
  form,
  setForm,
  onSubmit,
  saving,
  actionLabel,
}: SucursalFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 text-xs">
      <div>
        <label className="block mb-1 font-medium text-gray-700">
          Nombre de la sucursal
        </label>
        <input
          type="text"
          required
          maxLength={120}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7]"
          placeholder="Ej. Sucursal Centro"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">
          Dirección
        </label>
        <textarea
          rows={2}
          value={form.direccion}
          onChange={(e) =>
            setForm({ ...form, direccion: e.target.value })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7] resize-none"
          placeholder="Ej. Avenida Central, 250m norte de la iglesia..."
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-gray-700">
          Teléfono
        </label>
        <input
          type="tel"
          maxLength={20}
          value={form.telefono}
          onChange={(e) =>
            setForm({ ...form, telefono: e.target.value })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7]"
          placeholder="Ej. 8888-8888"
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
  sucursal: Sucursal;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmModal({
  mode,
  sucursal,
  loading,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const isDesactivar = mode === "desactivar";

  const title = isDesactivar
    ? "Desactivar sucursal"
    : "Activar sucursal";

  const description = isDesactivar
    ? "Esta sucursal no podrá usarse para nuevos movimientos de inventario hasta que la vuelvas a activar."
    : "La sucursal volverá a estar disponible para movimientos de inventario y asignación de stock.";

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
            <span className="font-semibold">{sucursal.nombre}</span>
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
