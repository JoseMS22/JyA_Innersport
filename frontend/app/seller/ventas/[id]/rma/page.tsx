// frontend/app/seller/ventas/[id]/rma/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductImage } from "@/components/ProductImage";
import { useToast } from "@/app/context/ToastContext";
import { SellerMenu } from "@/components/SellerMenu"; // 🆕 Importar Menú
import { apiFetch } from "@/lib/api"; // 🆕 Importar apiFetch

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Producto {
  id: number;
  nombre_producto: string;
  imagen_url?: string;
  precio_unitario: number;
  cantidad: number;
}

// 🆕 Tipo para el usuario del menú
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
  
  // 🆕 Estado para el usuario (Menú)
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

            // 1. 🆕 Cargar Usuario para el Menú
            const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
            if (!isMounted) return;
            if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
                router.push("/");
                return;
            }
            setUser(me);

            // 2. Cargar Venta POS (Usando fetch directo para manejo de errores específico)
            const res = await fetch(`${API_BASE}/api/v1/pos/ventas/${orderId}`, { credentials: "include" });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Error cargando la venta POS");
            }
            
            const data = await res.json();
            if (!isMounted) return;

            if (data.items && Array.isArray(data.items)) {
                setProductos(data.items);
                const initCantidades: Record<number, number> = {};
                data.items.forEach((p: Producto) => { initCantidades[p.id] = 1; });
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
    return () => { isMounted = false; };
  }, [orderId, showToast, router]);

  // 🆕 Función Logout para el menú
  async function handleLogout() {
    try { await apiFetch("/api/v1/auth/logout", { method: "POST" }); } catch {}
    router.push("/login");
  }

  const toggleItem = (id: number) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedItems(next);
  };

  const handleQuantityChange = (id: number, val: number, max: number) => {
      let nueva = val < 1 ? 1 : val > max ? max : val;
      setCantidades(prev => ({ ...prev, [id]: nueva }));
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
    if (selectedItems.size === 0) return showToast("⚠️ Selecciona productos", "error");
    if (!motivo.trim()) return showToast("⚠️ Escribe un motivo", "error");

    setSubmitting(true);
    try {
      let evidenciaUrl = null;

      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);
        const up = await fetch(`${API_BASE}/api/v1/rma/upload-evidence`, { method: "POST", credentials: "include", body: formData });
        if(up.ok) { const d = await up.json(); evidenciaUrl = d.url; }
      }

      const itemsPayload = Array.from(selectedItems).map(id => ({
        venta_pos_item_id: id,
        cantidad: cantidades[id] || 1
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
          items: itemsPayload
        })
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

  if (loading) return <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center text-gray-500">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {/* 🆕 AGREGAR EL MENÚ AQUÍ */}
      {user && (
        <div className="no-print">
          <SellerMenu user={user} onLogout={handleLogout} />
        </div>
      )}

      <main className="flex-1 py-8 px-4 w-full max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
              <div>
                <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-800 mb-1">← Cancelar</button>
                <h1 className="text-2xl font-bold text-[#6b21a8]">Tramitar Devolución</h1>
                <p className="text-sm text-gray-500">Solicitud para venta POS #{orderId}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
                {/* 1. Selección de Productos */}
                <div className="space-y-3">
                  <h2 className="font-semibold text-gray-700">Selecciona productos:</h2>
                  {productos.map((p) => {
                    const isSelected = selectedItems.has(p.id);
                    return (
                        <div key={p.id} className={`p-3 rounded-lg border transition-colors ${isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                            <div className="flex items-center gap-3">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleItem(p.id)} className="h-5 w-5 text-purple-600 rounded cursor-pointer"/>
                            
                            {/* 🔧 SECCIÓN DE IMAGEN MEJORADA */}
                            <div className="w-12 h-12 relative bg-gray-100 rounded overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                                {p.imagen_url ? (
                                    <ProductImage 
                                        src={p.imagen_url} 
                                        alt={p.nombre_producto} 
                                        fill 
                                        className="object-cover"
                                    />
                                ) : (
                                    // Placeholder si no hay imagen
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                )}
                            </div>
                            {/* 🔧 FIN SECCIÓN DE IMAGEN */}

                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{p.nombre_producto}</p>
                                <p className="text-xs text-gray-500">Comprados: <strong>{p.cantidad}</strong></p>
                            </div>
                        </div>
                            
                            {/* Selector de cantidad */}
                            {isSelected && (
                                <div className="mt-3 ml-8 flex items-center gap-2">
                                    <label className="text-xs font-semibold text-purple-700">A devolver:</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={p.cantidad} 
                                        value={cantidades[p.id]} 
                                        onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value), p.cantidad)}
                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:border-purple-500 outline-none"
                                    />
                                    <span className="text-xs text-gray-500">unidades</span>
                                </div>
                            )}
                        </div>
                    )
                  })}
                </div>

                {/* Resto del formulario (Tipo, Motivo, Foto, Botón) */}
                <div className="grid grid-cols-2 gap-4">
                    <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-1 ${tipo === 'devolucion' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                        <input type="radio" name="tipo" value="devolucion" checked={tipo === 'devolucion'} onChange={() => setTipo('devolucion')} className="sr-only"/>
                        <span className="font-semibold text-gray-700">💸 Reembolso</span>
                    </label>
                    <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center gap-1 ${tipo === 'cambio' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                        <input type="radio" name="tipo" value="cambio" checked={tipo === 'cambio'} onChange={() => setTipo('cambio')} className="sr-only"/>
                        <span className="font-semibold text-gray-700">🔄 Cambio</span>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Describe la razón..."></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Foto (Opcional)</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                    {previewUrl && (
                        <div className="mt-2 w-20 h-20 relative border rounded overflow-hidden">
                            <img src={previewUrl} alt="Preview" className="object-cover w-full h-full"/>
                            <button type="button" onClick={() => { setEvidenceFile(null); setPreviewUrl(null); }} className="absolute top-0 right-0 bg-red-500 text-white text-xs p-0.5">✕</button>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => router.back()} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                        {submitting ? "Enviando..." : "Confirmar"}
                    </button>
                </div>
            </form>
          </div>
      </main>
    </div>
  );
}