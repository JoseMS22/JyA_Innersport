// frontend/app/admin/rma/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/context/ToastContext"; // 🆕
import { ConfirmModal } from "@/components/ui/ConfirmModal"; // 🆕

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildMediaUrl(url: string | undefined) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${path}`;
}

interface RMA { id: number; pedido_id: number; usuario_id: number; tipo: string; estado: string; motivo: string; evidencia_url?: string; created_at: string; respuesta_admin?: string; }

const ESTADOS_RMA = {
  solicitado: { label: "Solicitado", color: "bg-yellow-100 text-yellow-800" },
  en_revision: { label: "En Revisión", color: "bg-blue-100 text-blue-800" },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-800" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  completado: { label: "Completado", color: "bg-gray-100 text-gray-800" },
};

export default function AdminRMAPage() {
  const { showToast } = useToast(); // 🆕 Hook
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRMA, setSelectedRMA] = useState<RMA | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [updating, setUpdating] = useState(false);

  // 🆕 Estado para el modal de confirmación
  const [confirmData, setConfirmData] = useState<{isOpen: boolean, action: string} | null>(null);

  const fetchRMAs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/rma/admin`, { credentials: "include" });
      if (res.ok) setRmas(await res.json());
    } catch (err) {
      console.error(err);
      showToast("Error al cargar RMAs", "error"); // 🆕
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRMAs();
  }, []);

  // 🆕 Wrapper para manejar la confirmación antes de actualizar
  const preHandleUpdate = (estado: string) => {
      if (estado === 'completado') {
          // Abrir modal personalizado
          setConfirmData({ isOpen: true, action: estado });
      } else {
          // Ejecutar directo para otros estados
          handleUpdateStatus(estado);
      }
  };

  const handleUpdateStatus = async (estado: string) => {
    if (!selectedRMA) return;
    setUpdating(true);
    setConfirmData(null); // Cerrar modal si estaba abierto

    try {
      const res = await fetch(`${API_BASE}/api/v1/rma/admin/${selectedRMA.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            estado,
            respuesta_admin: adminResponse
        }),
      });
      if (res.ok) {
        showToast("Estado actualizado correctamente", "success"); // 🆕
        setSelectedRMA(null);
        fetchRMAs();
      } else {
        throw new Error();
      }
    } catch (error) {
        showToast("Error al actualizar el estado", "error"); // 🆕
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Devoluciones y Cambios (RMA)</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidencia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rmas.map((rma) => (
                <tr key={rma.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{rma.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{rma.pedido_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{rma.tipo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rma.evidencia_url ? (
                        <span className="text-indigo-600 flex items-center gap-1">📷 <span className="text-xs">Sí</span></span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ESTADOS_RMA[rma.estado as keyof typeof ESTADOS_RMA]?.color}`}>
                      {ESTADOS_RMA[rma.estado as keyof typeof ESTADOS_RMA]?.label || rma.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(rma.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onClick={() => { setSelectedRMA(rma); setAdminResponse(rma.respuesta_admin || ""); }}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                    >Gestionar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rmas.length === 0 && <div className="p-10 text-center text-gray-500">No hay solicitudes pendientes.</div>}
        </div>
      )}

      {/* MODAL DE GESTIÓN */}
      {selectedRMA && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Gestionar RMA #{selectedRMA.id}</h2>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ESTADOS_RMA[selectedRMA.estado as keyof typeof ESTADOS_RMA]?.color}`}>
                      {ESTADOS_RMA[selectedRMA.estado as keyof typeof ESTADOS_RMA]?.label}
                    </span>
                </div>
                
                <div className="mb-4 space-y-2 text-sm">
                    <p className="text-gray-700"><strong>Motivo del Cliente:</strong></p>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-700 italic">"{selectedRMA.motivo}"</div>
                </div>

                {selectedRMA.evidencia_url && (
                    <div className="mb-6">
                        <p className="text-gray-700 text-sm font-bold mb-2">📷 Evidencia Adjunta:</p>
                        <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 flex justify-center">
                            <a href={buildMediaUrl(selectedRMA.evidencia_url)} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={buildMediaUrl(selectedRMA.evidencia_url)} alt="Evidencia RMA" className="max-h-64 object-contain bg-white rounded border border-gray-100 hover:opacity-95" />
                            </a>
                        </div>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Respuesta / Instrucciones</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100"
                        rows={3}
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder={selectedRMA.estado === 'completado' ? "Proceso finalizado." : "Ej: Aprobado. Por favor envíe el paquete a..."}
                        disabled={selectedRMA.estado === 'completado'} 
                    />
                </div>

                <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-100">
                    <button onClick={() => setSelectedRMA(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                        {selectedRMA.estado === 'completado' ? 'Cerrar' : 'Cancelar'}
                    </button>
                    
                    {selectedRMA.estado !== 'completado' && (
                        <>
                            <button onClick={() => preHandleUpdate('rechazado')} disabled={updating} className="px-4 py-2 bg-red-600 !text-white rounded-md hover:bg-red-700 font-medium transition-colors">Rechazar</button>
                            <button onClick={() => preHandleUpdate('aprobado')} disabled={updating} className="px-4 py-2 bg-green-600 !text-white rounded-md hover:bg-green-700 font-medium transition-colors">Aprobar</button>
                            <button onClick={() => preHandleUpdate('completado')} disabled={updating} className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 font-medium transition-colors">Completar</button>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 🆕 MODAL DE CONFIRMACIÓN */}
      <ConfirmModal
        isOpen={!!confirmData}
        title="Finalizar Proceso"
        message="¿Estás seguro? Al marcar como completado finalizará el proceso de devolución y se ajustará el inventario automáticamente. Esta acción no se puede deshacer."
        confirmText="Sí, completar"
        onConfirm={() => handleUpdateStatus('completado')}
        onCancel={() => setConfirmData(null)}
      />
    </div>
  );
}