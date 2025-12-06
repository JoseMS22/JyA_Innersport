// frontend/app/account/orders/[id]/rma/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductImage } from "@/components/ProductImage";
import { useToast } from "@/app/context/ToastContext"; // 🆕

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Producto { id: number; nombre: string; imagen_url: string; precio_unitario: number; cantidad: number; }

export default function CrearRMAPage() {
  const { showToast } = useToast(); // 🆕 Hook
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [tipo, setTipo] = useState<"devolucion" | "cambio">("devolucion");
  const [motivo, setMotivo] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/pedidos/${orderId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setProductos(data.productos);
        const initCantidades: Record<number, number> = {};
        data.productos.forEach((p: Producto) => { initCantidades[p.id] = 1; });
        setCantidades(initCantidades);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const toggleItem = (id: number) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleQuantityChange = (id: number, val: number, max: number) => {
      let nuevaCantidad = val;
      if (nuevaCantidad < 1) nuevaCantidad = 1;
      if (nuevaCantidad > max) nuevaCantidad = max;
      setCantidades(prev => ({ ...prev, [id]: nuevaCantidad }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEvidenceFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.size === 0) return showToast("⚠️ Selecciona al menos un producto", "error"); // 🆕
    if (!motivo.trim()) return showToast("⚠️ Debes escribir un motivo", "error"); // 🆕

    setSubmitting(true);
    try {
      let evidenciaUrl = null;

      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);
        const uploadRes = await fetch(`${API_BASE}/api/v1/rma/upload-evidence`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Error al subir la imagen");
        const uploadData = await uploadRes.json();
        evidenciaUrl = uploadData.url;
      }

      const itemsPayload = Array.from(selectedItems).map(id => ({
        pedido_item_id: id,
        cantidad: cantidades[id] || 1
      }));

      const res = await fetch(`${API_BASE}/api/v1/rma/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pedido_id: Number(orderId),
          tipo,
          motivo,
          evidencia_url: evidenciaUrl,
          items: itemsPayload
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al crear solicitud");
      }
      
      showToast("✅ Solicitud enviada con éxito", "success"); // 🆕
      router.push("/account/orders");
    } catch (error: any) {
      showToast(error.message, "error"); // 🆕
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800 mb-2">← Volver</button>
          <h1 className="text-2xl font-bold text-gray-900">Solicitar Devolución o Cambio</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Selecciona los productos y cantidad</h2>
            <div className="space-y-4">
              {productos.map((p) => {
                const isSelected = selectedItems.has(p.id);
                return (
                    <div key={p.id} className={`flex flex-col p-3 rounded-lg border transition-colors ${isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                      <div className="flex items-center">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleItem(p.id)} className="h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"/>
                          <div className="ml-4 h-12 w-12 relative rounded overflow-hidden bg-gray-200 flex-shrink-0">
                            <ProductImage src={p.imagen_url} alt={p.nombre} fill className="object-cover" />
                          </div>
                          <div className="ml-4 flex-1">
                            <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                            <p className="text-xs text-gray-500">Compraste: {p.cantidad} unidad(es)</p>
                          </div>
                      </div>
                      {isSelected && p.cantidad > 1 && (
                          <div className="mt-3 ml-9 pl-3 border-l-2 border-purple-200">
                              <label className="text-xs font-semibold text-purple-700 block mb-1">¿Cuántas devuelves? (Máx: {p.cantidad})</label>
                              <div className="flex items-center gap-3">
                                  <input type="number" min="1" max={p.cantidad} value={cantidades[p.id]} onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value), p.cantidad)} className="w-20 text-sm border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 py-1"/>
                                  <span className="text-xs text-gray-500">unidades</span>
                              </div>
                          </div>
                      )}
                    </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. ¿Qué deseas hacer?</h2>
             <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center gap-2 ${tipo === 'devolucion' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="tipo" value="devolucion" checked={tipo === 'devolucion'} onChange={() => setTipo('devolucion')} className="sr-only"/>
                    <span className="text-2xl">💸</span>
                    <span className="font-medium text-gray-900">Reembolso</span>
                </label>
                <label className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center gap-2 ${tipo === 'cambio' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="tipo" value="cambio" checked={tipo === 'cambio'} onChange={() => setTipo('cambio')} className="sr-only"/>
                    <span className="text-2xl">🔄</span>
                    <span className="font-medium text-gray-900">Cambio</span>
                </label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Cuéntanos el motivo</h2>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} className="w-full rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500" placeholder="El producto está dañado, no es mi talla, etc..."></textarea>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">4. Evidencia (Opcional)</h2>
            <div className="flex items-start gap-4">
                <div className="w-full">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                </div>
                {previewUrl && (
                    <div className="relative w-20 h-20 border rounded-lg overflow-hidden shrink-0">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setEvidenceFile(null); setPreviewUrl(null); }} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl text-xs">✕</button>
                    </div>
                )}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
            {submitting ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </form>
      </div>
    </div>
  );
}