"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Categoria = {
  id: number;
  nombre: string;
};

type Media = {
  id: number;
  url: string;
  tipo: string;
  orden: number;
};

type Producto = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  categorias: Categoria[];
  media: Media[];
};

type HistorialPrecio = {
  id: number;
  precio: number;
  vigente_desde: string;
};

type Variante = {
  id: number;
  sku: string | null;
  barcode: string | null;
  marca: string | null;
  color: string | null;
  talla: string | null;
  precio_actual: number;
  activo: boolean;
  historial_precios: HistorialPrecio[];
};

type VarianteRow = Variante & {
  _isNew?: boolean;
};

function buildMediaUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

export default function EditarProductoPage() {
  const { productoId } = useParams();
  const router = useRouter();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [marca, setMarca] = useState(""); // Marca única del producto

  const [variantes, setVariantes] = useState<VarianteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [savingMediaOrder, setSavingMediaOrder] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);


  function showSuccess(message: string) {
    setSuccessMsg(message);
    // limpiar error si había
    setErrorMsg(null);

    // borrar el mensaje después de unos segundos
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  }


  // =========================
  // Cargar datos
  // =========================
  async function loadData() {
    try {
      setLoading(true);

      const [pRes, cRes, vRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/productos/${productoId}`, {
          credentials: "include",
        }),
        fetch(`${API_BASE}/api/v1/categorias?solo_activas=true`, {
          credentials: "include",
        }),
        fetch(
          `${API_BASE}/api/v1/variantes/productos/${productoId}/variantes`,
          {
            credentials: "include",
          }
        ),
      ]);

      const pData = await pRes.json();
      const cData = await cRes.json();
      const vData: VarianteRow[] = await vRes.json();

      setProducto(pData);
      setCategorias(cData);
      setVariantes(vData);

      setNombre(pData.nombre);
      setDescripcion(pData.descripcion || "");
      setActivo(pData.activo);

      const catIds = (pData.categorias || []).map(
        (c: Categoria) => c.id
      );
      setSelectedCatIds(catIds);

      // Marca tomada de la primera variante (si existe)
      if (vData && vData.length > 0) {
        setMarca(vData[0].marca || "");
      } else {
        setMarca("");
      }

      const sortedMedia: Media[] = (pData.media || [])
        .slice()
        .sort((a: Media, b: Media) => {
          // por si vienen muchos con 0
          if (a.orden === b.orden) return a.id - b.id;
          return a.orden - b.orden;
        });

      setMediaList(sortedMedia);

    } catch (err) {
      console.error("Error cargando producto:", err);
      setErrorMsg("No se pudo cargar el producto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  // =========================
  // Categorías
  // =========================
  function toggleCategoria(id: number) {
    setSelectedCatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  // =========================
  // Guardar producto
  // =========================
  async function handleSaveProducto(e: FormEvent) {
    e.preventDefault();
    if (!producto) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/productos/${producto.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre,
            descripcion,
            activo,
            categorias_ids: selectedCatIds,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail || "No se pudo guardar el producto."
        );
      }

      await loadData();
      showSuccess("Los datos del producto se guardaron correctamente.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al guardar cambios.");
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // Variantes
  // =========================
  function updateVarianteField(
    index: number,
    field: keyof VarianteRow,
    value: any
  ) {
    setVariantes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addNewVarianteRow() {
    const nueva: VarianteRow = {
      id: 0,
      sku: "",
      barcode: "",
      marca: marca || "",
      color: "",
      talla: "",
      precio_actual: 0,
      activo: true,
      historial_precios: [],
      _isNew: true,
    };
    setVariantes((prev) => [...prev, nueva]);
  }

  async function saveVariante(index: number) {
    if (!producto) return;
    const v = variantes[index];

    try {
      if (v._isNew) {
        // Crear variante
        const res = await fetch(
          `${API_BASE}/api/v1/variantes/productos/${producto.id}/variantes`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: v.sku || null,
              barcode: v.barcode || null,
              marca: marca || null,
              color: v.color || null,
              talla: v.talla || null,
              precio_actual: v.precio_actual || 0,
            }),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.detail || "No se pudo crear la variante."
          );
        }
      } else {
        // Actualizar variante existente
        const res = await fetch(
          `${API_BASE}/api/v1/variantes/variantes/${v.id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: v.sku,
              barcode: v.barcode,
              marca: marca || null,
              color: v.color,
              talla: v.talla,
              precio_actual: v.precio_actual,
              activo: v.activo,
            }),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.detail || "No se pudo actualizar la variante."
          );
        }
      }

      await loadData();
      showSuccess("La variante se guardó correctamente.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al guardar la variante.");
    }
  }

  async function desactivarVariante(index: number) {
    const v = variantes[index];
    if (!v.id || v._isNew) {
      // Si es nueva y aún no se ha guardado, solo la quitamos
      setVariantes((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    if (!confirm("¿Eliminar (desactivar) esta variante?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/variantes/variantes/${v.id}/desactivar`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail || "No se pudo desactivar la variante."
        );
      }
      await loadData();
      showSuccess("La variante se desactivo correctamente.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al desactivar la variante.");
    }
  }

  // =========================
  // Media (imágenes)
  // =========================
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !producto) return;

    setUploading(true);
    try {
      const arr = Array.from(files);
      for (const file of arr) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(
          `${API_BASE}/api/v1/productos/${producto.id}/media/upload`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error("Error subiendo una imagen", errData);
        }
      }

      await loadData();
      showSuccess("La imagen se guardó correctamente.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al subir la imagen.");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  async function eliminarMedia(mediaId: number) {
    if (!producto) return;
    if (!confirm("¿Eliminar esta imagen?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/productos/media/${mediaId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail || "No se pudo eliminar la imagen."
        );
      }
      await loadData();
      showSuccess("La imagen se elimino correctamente.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al eliminar la imagen.");
    }
  }

  // mover imagen en la lista local
  function moveMedia(mediaId: number, direction: "up" | "down") {
    setMediaList((prev) => {
      const idx = prev.findIndex((m) => m.id === mediaId);
      if (idx === -1) return prev;

      const newIndex = direction === "up" ? idx - 1 : idx + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(newIndex, 0, item);
      return copy;
    });
  }

  // guardar orden en backend
  async function handleSaveMediaOrder() {
    if (!producto) return;
    if (mediaList.length === 0) return;

    setSavingMediaOrder(true);
    try {
      const items = mediaList.map((m, index) => ({
        id: m.id,
        orden: index + 1,
      }));

      const res = await fetch(
        `${API_BASE}/api/v1/productos/${producto.id}/media/reordenar`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.detail || "No se pudo guardar el orden de las imágenes."
        );
      }

      // refrescar todo para traer media ya con orden actualizado
      await loadData();
      showSuccess("El orden de las imágenes se guardó correctamente.");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al guardar el orden de las imágenes.");
    } finally {
      setSavingMediaOrder(false);
    }
  }

  // =========================
  // Render
  // =========================
  if (loading) {
    return (
      <p className="text-xs text-gray-500">
        Cargando datos del producto...
      </p>
    );
  }

  if (!producto) {
    return (
      <p className="text-xs text-red-500">
        No se encontró el producto.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            {producto.nombre}
          </h1>
          <p className="text-xs text-gray-500">
            Edita datos, variantes e imágenes del producto.
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/productos")}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Volver al listado
        </button>
      </header>

      {/* FORM PRODUCTO */}
      <form
        onSubmit={handleSaveProducto}
        className="bg-white rounded-2xl border border-gray-200 p-5 text-xs space-y-6 shadow-sm"
      >
        {/* Datos básicos */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">
            Datos básicos
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-gray-700 text-[11px]">
                Nombre
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700 text-[11px]">
                Estado
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  id="activo"
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label
                  htmlFor="activo"
                  className="text-xs text-gray-700"
                >
                  Producto activo
                </label>
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-medium text-gray-700 text-[11px]">
                Descripción
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            {/* Marca única */}
            <div className="space-y-1 md:col-span-2">
              <label className="font-medium text-gray-700 text-[11px]">
                Marca
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: Innersport, Nike..."
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Esta marca se utiliza para todas las variantes del producto.
              </p>
            </div>
          </div>
        </section>

        {/* Categorías */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">
            Categorías
          </h2>
          <p className="text-[11px] text-gray-500">
            Selecciona una o varias categorías para organizar el
            producto.
          </p>
          <div className="flex flex-wrap gap-2">
            {categorias.length === 0 ? (
              <span className="text-[11px] text-gray-400">
                No hay categorías activas.
              </span>
            ) : (
              categorias.map((c) => {
                const active = selectedCatIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategoria(c.id)}
                    className={`px-3 py-1 rounded-full border text-[11px] transition-colors ${active
                        ? "bg-[#a855f7] border-[#a855f7] text-white shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-[#a855f7]"
                      }`}
                  >
                    {c.nombre}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800">
            {successMsg}
          </div>
        )}


        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/productos")}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 text-xs rounded-full bg-[#a855f7] text-white font-semibold hover:bg-[#7e22ce] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      {/* VARIANTES */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 text-xs space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">
              Variantes
            </h2>
            <p className="text-[11px] text-gray-500">
              Gestiona tallas, colores, SKU, código de barras y precio.
            </p>
          </div>
          <button
            type="button"
            onClick={addNewVarianteRow}
            className="text-[11px] px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-black shadow-sm"
          >
            + Nueva variante
          </button>
        </div>

        {variantes.length === 0 ? (
          <p className="text-[11px] text-gray-400">
            No hay variantes registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {variantes.map((v, index) => (
              <div
                key={`${v.id}-${index}`}
                className="grid md:grid-cols-[1.1fr,0.9fr,0.9fr,1fr,0.9fr,auto] gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl p-3"
              >
                <div className="space-y-1">
                  <label className="font-medium text-gray-700 text-[11px]">
                    Color
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                    value={v.color || ""}
                    onChange={(e) =>
                      updateVarianteField(index, "color", e.target.value)
                    }
                    placeholder="Ej: Negro"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-gray-700 text-[11px]">
                    Talla
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                    value={v.talla || ""}
                    onChange={(e) =>
                      updateVarianteField(index, "talla", e.target.value)
                    }
                    placeholder="Ej: M"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-gray-700 text-[11px]">
                    SKU
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                    value={v.sku || ""}
                    onChange={(e) =>
                      updateVarianteField(index, "sku", e.target.value)
                    }
                    placeholder="Código interno"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-gray-700 text-[11px]">
                    Código de barras
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                    value={v.barcode || ""}
                    onChange={(e) =>
                      updateVarianteField(index, "barcode", e.target.value)
                    }
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-gray-700 text-[11px]">
                    Precio
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                    value={v.precio_actual}
                    onChange={(e) =>
                      updateVarianteField(
                        index,
                        "precio_actual",
                        Number(e.target.value) || 0
                      )
                    }
                  />
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      id={`var-activo-${index}`}
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={v.activo}
                      onChange={(e) =>
                        updateVarianteField(
                          index,
                          "activo",
                          e.target.checked
                        )
                      }
                    />
                    <label
                      htmlFor={`var-activo-${index}`}
                      className="text-[10px] text-gray-600"
                    >
                      Activa
                    </label>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => saveVariante(index)}
                    className="text-[11px] px-2 py-1 rounded-full bg-[#a855f7] text-white hover:bg-[#7e22ce]"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => desactivarVariante(index)}
                    className="text-[11px] px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MEDIA */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 text-xs space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">
              Imágenes del producto
            </h2>
            <p className="text-[11px] text-gray-500">
              Sube imágenes y gestiona la galería del producto. El orden lo
              define el campo <code>orden</code>, que puedes ajustar aquí.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <label className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-900 text-white text-[11px] cursor-pointer hover:bg-black shadow-sm">
              {uploading ? "Subiendo..." : "Subir imágenes"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>

            {mediaList.length > 1 && (
              <button
                type="button"
                onClick={handleSaveMediaOrder}
                disabled={savingMediaOrder}
                className="px-3 py-1.5 rounded-full border border-[#a855f7]/40 text-[11px] text-[#6b21a8] bg-[#f5ecff] hover:bg-[#ede0ff] disabled:opacity-60"
              >
                {savingMediaOrder
                  ? "Guardando orden..."
                  : "Guardar orden de imágenes"}
              </button>
            )}
          </div>
        </div>

        {mediaList && mediaList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mediaList.map((m, index) => (
              <div
                key={m.id}
                className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm flex flex-col"
              >
                <div className="aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildMediaUrl(m.url)}
                    alt="Producto"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Orden + controles */}
                <div className="absolute top-1 left-1 flex items-center gap-1">
                  <span className="text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded-full">
                    #{index + 1}
                  </span>
                </div>

                <div className="absolute top-1 right-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveMedia(m.id, "up")}
                    disabled={index === 0}
                    className="text-[10px] bg-white/80 text-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 disabled:opacity-40"
                    title="Subir"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMedia(m.id, "down")}
                    disabled={index === mediaList.length - 1}
                    className="text-[10px] bg-white/80 text-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 disabled:opacity-40"
                    title="Bajar"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => eliminarMedia(m.id)}
                    className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full hover:bg-red-700"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400">
            Aún no hay imágenes para este producto.
          </p>
        )}
      </section>
    </div>
  );
}
