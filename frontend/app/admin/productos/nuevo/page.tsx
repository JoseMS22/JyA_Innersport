// frontend/app/admin/productos/nuevo/page.tsx
"use client";

import {
  FormEvent,
  useEffect,
  useState,
  ChangeEvent,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Categoria = {
  id: number;
  nombre: string;
};

type Sucursal = {
  id: number;
  nombre: string;
};

type VarianteForm = {
  color: string;
  talla: string;
  sku: string;
  barcode: string;
  precio_actual: number | "";
  stock_inicial: number | "";
  min_stock: number | "";
};

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function NuevoProductoPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategorias, setSelectedCategorias] = useState<number[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalStockId, setSucursalStockId] = useState<number | "">("");

  const [variantes, setVariantes] = useState<VarianteForm[]>([
    {
      color: "",
      talla: "",
      sku: "",
      barcode: "",
      precio_actual: "",
      stock_inicial: "",
      min_stock: "",
    },
  ]);

  // Índice de variante que se está editando en el modal de detalles
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);


  // 📸 Imágenes con orden
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // =========================
  // Cargar categorías y sucursales activas
  // =========================
  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, sucRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/categorias?solo_activas=true`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/v1/sucursales?solo_activas=true`, {
            credentials: "include",
          }),
        ]);

        const catData = await catRes.json();
        const sucData = await sucRes.json();
        setCategorias(catData);
        setSucursales(sucData);
      } catch (err) {
        console.error("Error cargando cat/suc:", err);
      }
    }
    loadData();
  }, []);

  // Liberar URLs de preview cuando cambien
  useEffect(() => {
    return () => {
      mediaItems.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    };
  }, [mediaItems]);

  // =========================
  // Helpers
  // =========================

  function toggleCategoria(id: number) {
    setSelectedCategorias((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function updateVariante(
    index: number,
    field: keyof VarianteForm,
    value: any
  ) {
    setVariantes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addVarianteRow() {
    setVariantes((prev) => [
      ...prev,
      {
        color: "",
        talla: "",
        sku: "",
        barcode: "",
        precio_actual: "",
        stock_inicial: "",
        min_stock: "",
      },
    ]);
  }

  function removeVarianteRow(index: number) {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  }

  // Agrupar variantes por color para mostrarlas en tarjetas
  const varianteGroups = useMemo(() => {
    const map = new Map<
      string,
      { color: string; indices: number[] }
    >();

    variantes.forEach((v, index) => {
      const key = v.color || "__sin_color__";
      if (!map.has(key)) {
        map.set(key, {
          color: v.color || "",
          indices: [],
        });
      }
      map.get(key)!.indices.push(index);
    });

    return Array.from(map.values());
  }, [variantes]);

  function addColorGroup() {
    // Crea un grupo nuevo con una variante vacía
    setVariantes((prev) => [
      ...prev,
      {
        color: "",
        talla: "",
        sku: "",
        barcode: "",
        precio_actual: "",
        stock_inicial: "",
        min_stock: "",
      },
    ]);
  }

  function updateColorForGroup(indices: number[], newColor: string) {
    setVariantes((prev) => {
      const copy = [...prev];
      indices.forEach((i) => {
        copy[i] = { ...copy[i], color: newColor };
      });
      return copy;
    });
  }

  function removeColorGroup(indices: number[]) {
    setVariantes((prev) =>
      prev.filter((_, idx) => !indices.includes(idx))
    );
  }

  function addTallaToColor(colorValue: string) {
    setVariantes((prev) => [
      ...prev,
      {
        color: colorValue,
        talla: "",
        sku: "",
        barcode: "",
        precio_actual: "",
        stock_inicial: "",
        min_stock: "",
      },
    ]);
  }


  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    const arr = Array.from(fileList);

    const newItems: MediaItem[] = arr.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setMediaItems((prev) => [...prev, ...newItems]);
    // Limpio el input para poder volver a seleccionar las mismas
    e.target.value = "";
  }

  function removeMediaItem(index: number) {
    setMediaItems((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  function moveMediaItem(index: number, direction: "up" | "down") {
    setMediaItems((prev) => {
      const copy = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  }

  // =========================
  // Submit
  // =========================

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    // ❗ Validar sucursal obligatoria
    if (sucursalStockId === "") {
      setLoading(false);
      setErrorMsg("Debes seleccionar una sucursal para el stock inicial.");
      return;
    }


    try {
      // 1) Crear producto
      const resProd = await fetch(`${API_BASE}/api/v1/productos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion,
          categorias_ids:
            selectedCategorias.length > 0 ? selectedCategorias : null,
        }),
      });

      if (!resProd.ok) {
        const errData = await resProd.json().catch(() => ({}));
        throw new Error(errData?.detail || "No se pudo crear el producto.");
      }

      const prod = await resProd.json();
      const productoId: number = prod.id;

      // 2) Crear variantes (todas con la misma marca)
      const variantesValidas = variantes.filter((v) => {
        const hasBasic =
          v.color.trim() || v.talla.trim() || v.sku.trim() || v.barcode.trim();
        const hasPrice =
          typeof v.precio_actual === "number" && v.precio_actual > 0;
        return hasBasic || hasPrice;
      });

      const variantesIds: number[] = [];

      for (const v of variantesValidas) {
        const resVar = await fetch(
          `${API_BASE}/api/v1/variantes/productos/${productoId}/variantes`,
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
              precio_actual:
                typeof v.precio_actual === "number" && v.precio_actual > 0
                  ? v.precio_actual
                  : 0,
            }),
          }
        );

        if (!resVar.ok) {
          const errData = await resVar.json().catch(() => ({}));
          throw new Error(errData?.detail || "Error al crear una variante.");
        }

        const varianteCreated = await resVar.json();
        variantesIds.push(varianteCreated.id);

        // 3) Stock inicial en inventario (si sucursal y cantidad)
        if (
          sucursalStockId &&
          typeof v.stock_inicial === "number" &&
          v.stock_inicial > 0
        ) {
          await fetch(`${API_BASE}/api/v1/inventario/ajustar`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sucursal_id: sucursalStockId,
              variante_id: varianteCreated.id,
              tipo: "ENTRADA",
              cantidad: v.stock_inicial,
              motivo: "Stock inicial",
              referencia: `Alta producto ${productoId}`,
              min_stock:
                typeof v.min_stock === "number" && v.min_stock >= 0
                  ? v.min_stock
                  : undefined,
            }),
          });
        }
      }

      // 4) Subir media en el orden definido
      if (mediaItems.length > 0) {
        for (let index = 0; index < mediaItems.length; index++) {
          const item = mediaItems[index];
          const formData = new FormData();
          formData.append("file", item.file);
          // 👇 Si tu endpoint lo soporta, puedes usar esto para guardar el orden:
          formData.append("orden", String(index)); // 0 = primera, 1 = segunda, etc.

          const resUpload = await fetch(
            `${API_BASE}/api/v1/productos/${productoId}/media/upload`,
            {
              method: "POST",
              credentials: "include",
              body: formData,
            }
          );

          if (!resUpload.ok) {
            console.error(
              "Error subiendo imagen",
              await resUpload.text().catch(() => "")
            );
          }
        }
      }

      // 5) Redirigir a la página de edición del producto
      router.push(`/admin/productos/${productoId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Ocurrió un error al crear el producto.");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // Render
  // =========================

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#6b21a8]">
            Nuevo producto
          </h1>
          <p className="text-xs text-gray-500">
            Crea el producto, define sus variantes, stock inicial e imágenes.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 p-5 text-xs space-y-6 shadow-sm"
      >
        {/* Datos del producto */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">
            Datos del producto
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
                placeholder="Ej: Legging deportivo negro"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-medium text-gray-700 text-[11px]">
                Descripción
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe brevemente el producto..."
              />
            </div>

            {/* Marca como campo único para el producto */}
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
            </div>
          </div>
        </section>

        {/* Categorías */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">
            Categorías
          </h2>
          <p className="text-[11px] text-gray-500">
            Selecciona una o varias categorías.
          </p>
          <div className="flex flex-wrap gap-2">
            {categorias.length === 0 ? (
              <span className="text-[11px] text-gray-400">
                No hay categorías activas.
              </span>
            ) : (
              categorias.map((c) => {
                const active = selectedCategorias.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategoria(c.id)}
                    className={`px-3 py-1 rounded-full border text-[11px] transition-colors ${active
                      ? "bg-[#f5f3ff] border-[#d8b4fe] text-[#6b21a8] shadow-sm"
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

        {/* Variantes + stock inicial */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">
                Variantes y stock inicial
              </h2>
              <p className="text-[11px] text-gray-500">
                Define colores, tallas, precio y cantidad inicial en una sucursal.
              </p>
            </div>
            <button
              type="button"
              onClick={addColorGroup}
              className="self-start md:self-auto inline-flex items-center gap-1 text-[11px]
             px-3 py-1.5 rounded-full bg-[#f5f3ff] text-[#6b21a8]
             border border-[#e9d5ff] hover:bg-[#ede9fe] hover:border-[#c4b5fd]
             shadow-sm transition-colors"
            >
              <span>🎨</span>
              <span>Agregar color</span>
            </button>
          </div>

          {/* Sucursal para stock inicial */}
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-3 md:p-4 space-y-2">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-gray-800 text-xs">
                Sucursal para stock inicial
              </span>
              <p className="text-[11px] text-gray-500">
                Esta sucursal recibirá el stock inicial de las variantes
                que tengan cantidad &gt; 0.
              </p>
            </div>
            <div className="mt-1">
              <select
                required
                className="w-full border border-gray-200 rounded-full px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                value={sucursalStockId === "" ? "" : String(sucursalStockId)}
                onChange={(e) =>
                  setSucursalStockId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="">-- Seleccionar sucursal (obligatorio) --</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {varianteGroups.length === 0 ? (
            <p className="text-[11px] text-gray-400">
              Añade al menos un color para manejar tallas y stock.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {varianteGroups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)]
                     bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-3"
                >
                  {/* Header color */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="font-medium text-gray-700 text-[11px]">
                        Color
                      </label>
                      <input
                        className="w-full border border-gray-200 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                        value={group.color}
                        onChange={(e) =>
                          updateColorForGroup(group.indices, e.target.value)
                        }
                        placeholder="Ej: Negro"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColorGroup(group.indices)}
                      className="inline-flex items-center justify-center text-[11px] px-2 py-1.5 rounded-full
                         bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Tallas dentro del color */}
                  <div className="space-y-2">
                    {group.indices.map((variantIndex) => {
                      const v = variantes[variantIndex];
                      return (
                        <div
                          key={variantIndex}
                          className="rounded-xl bg-white border border-gray-200 px-2.5 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-gray-700">
                                Talla
                              </span>
                              <input
                                className="w-16 border border-gray-200 rounded px-2 py-0.5 text-[11px] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                                value={v.talla}
                                onChange={(e) =>
                                  updateVariante(variantIndex, "talla", e.target.value)
                                }
                                placeholder="M"
                              />
                            </div>
                            <p className="text-[10px] text-gray-500">
                              {typeof v.precio_actual === "number" && v.precio_actual > 0
                                ? `₡${v.precio_actual} · `
                                : ""}
                              {typeof v.stock_inicial === "number" &&
                                v.stock_inicial > 0
                                ? `${v.stock_inicial} u.`
                                : "Sin stock inicial"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveVariantIndex(variantIndex)}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full
                                 bg-[#f5f3ff] text-[#6b21a8] border border-[#e9d5ff]
                                 hover:bg-[#ede9fe] hover:border-[#c4b5fd] transition-colors"
                            >
                              ⚙️ Detalles
                            </button>
                            <button
                              type="button"
                              onClick={() => removeVarianteRow(variantIndex)}
                              className="inline-flex items-center justify-center text-[10px] px-2 py-1 rounded-full
                                 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addTallaToColor(group.color)}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full
                         bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors"
                    >
                      ➕ Agregar talla
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* Media */}
        <section className="space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">
            Imágenes del producto
          </h2>
          <p className="text-[11px] text-gray-500">
            Puedes seleccionar varias imágenes. Se subirán después de guardar el
            producto. El orden que ves aquí será el orden en que se mostrarán.
          </p>

          {/* Dropzone simple */}
          <label className="block w-full border border-dashed border-gray-300 rounded-2xl bg-gray-50/70 px-4 py-6 text-center cursor-pointer hover:border-[#a855f7] hover:bg-gray-50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">📸</span>
              <span className="text-[11px] font-medium text-gray-700">
                Haz clic para seleccionar imágenes
              </span>
              <span className="text-[10px] text-gray-400">
                Formatos comunes (JPG, PNG, WEBP). Puedes elegir varias a la vez.
              </span>
            </div>
          </label>

          {/* Previews con orden */}
          {mediaItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-600">
                {mediaItems.length} imagen(es) seleccionada(s). Puedes ajustar el orden.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
                  >
                    <div className="absolute top-1 left-1 z-10">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full
               bg-[#f5f3ff] text-[#6b21a8] border border-[#d8b4fe]
               text-[10px] shadow-sm"
                      >
                        {index + 1}
                      </span>
                    </div>

                    <img
                      src={item.previewUrl}
                      alt={`Imagen ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2 pb-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-center gap-1">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveMediaItem(index, "up")}
                            disabled={index === 0}
                            className="px-2 py-0.5 rounded-full text-[10px] bg-white/90 text-gray-800 disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMediaItem(index, "down")}
                            disabled={index === mediaItems.length - 1}
                            className="px-2 py-0.5 rounded-full text-[10px] bg-white/90 text-gray-800 disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMediaItem(index)}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white hover:bg-red-700"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-xs rounded-full
             bg-[#f5f3ff] text-[#6b21a8] border border-[#e9d5ff]
             font-semibold hover:bg-[#ede9fe] hover:border-[#c4b5fd]
             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Guardando..." : "Crear producto"}
          </button>

        </div>

        {/* Modal de detalles de variante (talla) */}
        {activeVariantIndex !== null && variantes[activeVariantIndex] && (
          <VariantDetailsModal
            variante={variantes[activeVariantIndex]}
            onChange={(field, value) =>
              updateVariante(activeVariantIndex, field, value)
            }
            onClose={() => setActiveVariantIndex(null)}
          />
        )}

      </form>
    </div>
  );
}

type VariantDetailsModalProps = {
  variante: VarianteForm;
  onChange: (field: keyof VarianteForm, value: any) => void;
  onClose: () => void;
};

function VariantDetailsModal({
  variante,
  onChange,
  onClose,
}: VariantDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 text-xs space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-800">
            Detalles de talla
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 col-span-2">
            <label className="font-medium text-gray-700 text-[11px]">
              Talla
            </label>
            <input
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
              value={variante.talla}
              onChange={(e) => onChange("talla", e.target.value)}
              placeholder="Ej: M"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-gray-700 text-[11px]">
              SKU
            </label>
            <input
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
              value={variante.sku}
              onChange={(e) => onChange("sku", e.target.value)}
              placeholder="Código interno"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-gray-700 text-[11px]">
              Código de barras
            </label>
            <input
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
              value={variante.barcode}
              onChange={(e) => onChange("barcode", e.target.value)}
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
              value={variante.precio_actual}
              onChange={(e) =>
                onChange(
                  "precio_actual",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-gray-700 text-[11px]">
              Cantidad inicial
            </label>
            <input
              type="number"
              min={0}
              step="1"
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
              value={variante.stock_inicial}
              onChange={(e) =>
                onChange(
                  "stock_inicial",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </div>

          <div className="space-y-1 col-span-2">
            <label className="font-medium text-gray-700 text-[11px]">
              Stock mínimo (opcional)
            </label>
            <input
              type="number"
              min={0}
              step="1"
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
              value={variante.min_stock}
              onChange={(e) =>
                onChange(
                  "min_stock",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
