// frontend/app/account/orders/[id]/rma/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { ProductImage } from "@/components/ProductImage";
import { useNotifications } from "@/app/context/NotificationContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Producto { 
  id: number; 
  nombre: string; 
  imagen_url: string; 
  precio_unitario: number; 
  cantidad: number; 
}

export default function CrearRMAPage() {
  const { success, error: showError } = useNotifications();
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
      .catch((err) => {
        console.error(err);
        showError("Error al cargar", "No se pudieron cargar los productos del pedido");
      })
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
    
    if (selectedItems.size === 0) {
      showError("Selección requerida", "Debes seleccionar al menos un producto");
      return;
    }
    
    if (!motivo.trim()) {
      showError("Motivo requerido", "Debes escribir un motivo para la solicitud");
      return;
    }

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
      
      success("Solicitud enviada", "Tu solicitud ha sido enviada exitosamente. Te contactaremos pronto.");
      setTimeout(() => {
        router.push(`/account/orders/${orderId}`);
      }, 1500);
    } catch (error: any) {
      showError("Error al enviar", error.message || "No se pudo enviar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      <MainMenu />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 pt-[140px]">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center gap-2 mb-6 py-3 text-sm flex-wrap">
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
          <button
            onClick={() => router.push("/account/orders")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Mis pedidos
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push(`/account/orders/${orderId}`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Pedido #{orderId}
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Solicitar devolución
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Solicitar Devolución o Cambio
            </h1>
            <p className="text-sm text-gray-600">
              Completa el formulario para procesar tu solicitud
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Paso 1: Seleccionar productos */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                  1
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  Selecciona los productos y cantidad
                </h2>
              </div>
              
              <div className="space-y-4">
                {productos.map((p) => {
                  const isSelected = selectedItems.has(p.id);
                  return (
                    <div 
                      key={p.id} 
                      className={`flex flex-col p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? "border-purple-500 bg-purple-50 shadow-md" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleItem(p.id)} 
                          className="h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                        />
                        <div className="ml-4 h-16 w-16 relative rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 border-2 border-gray-200 flex items-center justify-center">
                          {p.imagen_url ? (
                            <ProductImage 
                              src={p.imagen_url} 
                              alt={p.nombre} 
                              fill 
                              className="object-cover" 
                            />
                          ) : (
                            <span className="text-xs text-gray-400">Sin foto</span>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Compraste: <span className="font-medium">{p.cantidad}</span> unidad{p.cantidad > 1 ? 'es' : ''}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Precio: <span className="font-medium">₡{p.precio_unitario.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>
                      
                      {isSelected && p.cantidad > 1 && (
                        <div className="mt-4 ml-9 pl-4 border-l-2 border-purple-300 bg-white/60 rounded-r-lg py-2 pr-2">
                          <label className="text-xs font-semibold text-purple-700 block mb-2">
                            ¿Cuántas unidades devuelves? (Máximo: {p.cantidad})
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              min="1" 
                              max={p.cantidad} 
                              value={cantidades[p.id]} 
                              onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value), p.cantidad)} 
                              className="w-24 text-sm border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 py-2 px-3 font-medium"
                            />
                            <span className="text-xs text-gray-600">unidades</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Paso 2: Tipo de solicitud */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                  2
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  ¿Qué deseas hacer?
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label 
                  className={`cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center gap-3 transition-all ${
                    tipo === 'devolucion' 
                      ? 'border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-200' 
                      : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="tipo" 
                    value="devolucion" 
                    checked={tipo === 'devolucion'} 
                    onChange={() => setTipo('devolucion')} 
                    className="sr-only"
                  />
                  <span className="text-4xl">💸</span>
                  <span className="font-semibold text-gray-900">Reembolso</span>
                  <span className="text-xs text-gray-500 text-center">Devolución del dinero</span>
                </label>
                
                <label 
                  className={`cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center gap-3 transition-all ${
                    tipo === 'cambio' 
                      ? 'border-purple-500 bg-purple-50 shadow-md ring-2 ring-purple-200' 
                      : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="tipo" 
                    value="cambio" 
                    checked={tipo === 'cambio'} 
                    onChange={() => setTipo('cambio')} 
                    className="sr-only"
                  />
                  <span className="text-4xl">🔄</span>
                  <span className="font-semibold text-gray-900">Cambio</span>
                  <span className="text-xs text-gray-500 text-center">Por otro producto</span>
                </label>
              </div>
            </div>

            {/* Paso 3: Motivo */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                  3
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  Cuéntanos el motivo
                </h2>
              </div>
              
              <textarea 
                value={motivo} 
                onChange={(e) => setMotivo(e.target.value)} 
                rows={5} 
                className="w-full rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 p-4 text-sm"
                placeholder="Ejemplo: El producto llegó con defectos, la talla no es la correcta, el color no coincide con la foto, etc..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">
                {motivo.length}/500 caracteres
              </p>
            </div>

            {/* Paso 4: Evidencia */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                  4
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  Evidencia (Opcional)
                </h2>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                <div className="flex flex-col items-center gap-4">
                  {!previewUrl ? (
                    <>
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          Sube una foto del problema (opcional)
                        </p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                      />
                    </>
                  ) : (
                    <div className="relative w-full max-w-xs">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-200" 
                      />
                      <button 
                        type="button" 
                        onClick={() => { 
                          setEvidenceFile(null); 
                          setPreviewUrl(null); 
                        }} 
                        className="absolute -top-2 -right-2 bg-red-500 !text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botón de envío */}
            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={submitting || selectedItems.size === 0 || !motivo.trim()} 
                className="flex-1 py-3 bg-purple-600 !text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  "Enviar Solicitud"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <RecommendedFooter />
    </div>
  );
}