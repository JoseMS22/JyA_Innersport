// frontend/app/seller/ventas/[id]/rma/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductImage } from "@/components/ProductImage";
import { useToast } from "@/app/context/ToastContext";
import { SellerMenu } from "@/components/SellerMenu";
import { Tooltip } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Producto {
  id: number;
  nombre_producto: string;
  imagen_url?: string;
  precio_unitario: number;
  cantidad: number;
}

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export default function SellerCreateRMAPage() {
  const { showToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [user, setUser] = useState<UserMe | null>(null);

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tipo, setTipo] = useState<"devolucion" | "cambio">("devolucion");
  const [motivo, setMotivo] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // 1. Cargar Usuario para el Menú
        const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
        if (!isMounted) return;
        if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setUser(me);

        // 2. Cargar Venta POS
        const res = await fetch(`${API_BASE}/api/v1/pos/ventas/${orderId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Error cargando la venta POS");
        }

        const data = await res.json();
        if (!isMounted) return;

        if (data.items && Array.isArray(data.items)) {
          setProductos(data.items);
          const initCantidades: Record<number, number> = {};
          data.items.forEach((p: Producto) => {
            initCantidades[p.id] = 1;
          });
          setCantidades(initCantidades);
        }
      } catch (err: any) {
        console.error(err);
        if (err.status === 401) router.push("/login");
        else showToast(err.message, "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [orderId, showToast, router]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  }

  const toggleItem = (id: number) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleQuantityChange = (id: number, val: number, max: number) => {
    let nueva = val < 1 ? 1 : val > max ? max : val;
    setCantidades((prev) => ({ ...prev, [id]: nueva }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setEvidenceFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.size === 0)
      return showToast("⚠️ Selecciona al menos un producto", "error");
    if (!motivo.trim()) return showToast("⚠️ Escribe un motivo", "error");

    setSubmitting(true);
    try {
      let evidenciaUrl = null;

      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);
        const up = await fetch(`${API_BASE}/api/v1/rma/upload-evidence`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (up.ok) {
          const d = await up.json();
          evidenciaUrl = d.url;
        }
      }

      const itemsPayload = Array.from(selectedItems).map((id) => ({
        venta_pos_item_id: id,
        cantidad: cantidades[id] || 1,
      }));

      const res = await fetch(`${API_BASE}/api/v1/rma/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          venta_pos_id: Number(orderId),
          tipo,
          motivo,
          evidencia_url: evidenciaUrl,
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error creando solicitud");
      }

      showToast("✅ Solicitud creada correctamente", "success");
      router.push(`/seller/ventas/${orderId}`);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center text-gray-500">
        Cargando...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {/* MENÚ */}
      {user && (
        <div className="no-print">
          <SellerMenu user={user} onLogout={handleLogout} />
        </div>
      )}

      <main className="flex-1 py-8 px-4 w-full max-w-5xl mx-auto">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center py-3 gap-2 mb-6 text-sm flex-wrap">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Inicio
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push("/seller/pos")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            POS
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push("/seller/ventas")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Ventas
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push(`/seller/ventas/${orderId}`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Venta #{orderId}
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Tramitar Devolución
          </span>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="p-6 border-b border-gray-100 bg-white">
            <h1 className="text-2xl font-bold text-[#6b21a8]">
              Tramitar Devolución
            </h1>
            <p className="text-sm text-gray-500">
              Solicitud para venta POS #{orderId}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* 1. Selección de Productos */}
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-700">
                Selecciona productos:
              </h2>
              {productos.map((p) => {
                const isSelected = selectedItems.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(p.id)}
                        className="h-5 w-5 text-purple-600 rounded cursor-pointer"
                      />

                      {/* Sección de imagen */}
                      <div className="w-12 h-12 relative bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                        {p.imagen_url ? (
                          <ProductImage
                            src={p.imagen_url}
                            alt={p.nombre_producto}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6 text-gray-400"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {p.nombre_producto}
                        </p>
                        <p className="text-xs text-gray-500">
                          Comprados: <strong>{p.cantidad}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Selector de cantidad */}
                    {isSelected && (
                      <div className="mt-3 ml-8 flex items-center gap-2">
                        <label className="text-xs font-semibold text-purple-700">
                          A devolver:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={p.cantidad}
                          value={cantidades[p.id]}
                          onChange={(e) =>
                            handleQuantityChange(
                              p.id,
                              parseInt(e.target.value),
                              p.cantidad
                            )
                          }
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:border-purple-500 outline-none"
                        />
                        <span className="text-xs text-gray-500">unidades</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. Tipo de devolución con tooltips */}
            <div>
              <h2 className="font-semibold text-gray-700 mb-3">
                Tipo de solicitud:
              </h2>
              <div className="flex gap-4 justify-center">
                <Tooltip text="Reembolso" position="bottom">
                  <label
                    className={`cursor-pointer border rounded-lg p-4 flex items-center justify-center transition-all hover:shadow-md ${
                      tipo === "devolucion"
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value="devolucion"
                      checked={tipo === "devolucion"}
                      onChange={() => setTipo("devolucion")}
                      className="sr-only"
                    />
                    <svg
                      className={`w-8 h-8 ${
                        tipo === "devolucion" ? "text-purple-600" : "text-gray-500"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </label>
                </Tooltip>

                <Tooltip text="Cambio" position="bottom">
                  <label
                    className={`cursor-pointer border rounded-lg p-4 flex items-center justify-center transition-all hover:shadow-md ${
                      tipo === "cambio"
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value="cambio"
                      checked={tipo === "cambio"}
                      onChange={() => setTipo("cambio")}
                      className="sr-only"
                    />
                    <svg
                      className={`w-8 h-8 ${
                        tipo === "cambio" ? "text-purple-600" : "text-gray-500"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </label>
                </Tooltip>
              </div>
            </div>

            {/* 3. Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de la devolución
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Describe la razón de la devolución..."
              ></textarea>
            </div>

            {/* 4. Evidencia fotográfica */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto de evidencia (Opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {previewUrl && (
                <div className="mt-2 relative inline-block">
                  <div className="w-32 h-32 relative border rounded overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 shadow-md"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* 5. Botones de acción */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {submitting ? "Enviando..." : "Confirmar solicitud"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}