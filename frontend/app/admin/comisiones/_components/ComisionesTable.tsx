// app/admin/comisiones/_components/ComisionesTable.tsx
"use client";

import { useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import type { Comision } from "@/types/comisiones";

type ComisionesTableProps = {
  comisiones: Comision[];
  loading: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onRefresh: () => void;
};

export function ComisionesTable({
  comisiones,
  loading,
  selectedIds,
  onSelectionChange,
  onRefresh,
}: ComisionesTableProps) {
  const [detalleComision, setDetalleComision] = useState<Comision | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendientes = comisiones
        .filter((c) => c.estado === "PENDIENTE")
        .map((c) => c.id);
      onSelectionChange(pendientes);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((cid) => cid !== id));
    }
  };

  const formatearFecha = (fecha: string) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString("es-CR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  const formatearMoneda = (monto: number) => {
    return `₡${monto.toLocaleString("es-CR")}`;
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      PENDIENTE: "bg-yellow-100 text-yellow-700 border-yellow-300",
      LIQUIDADA: "bg-green-100 text-green-700 border-green-300",
      CANCELADA: "bg-red-100 text-red-700 border-red-300",
    };
    return badges[estado as keyof typeof badges] || "bg-gray-100 text-gray-700";
  };

  const handleVerDetalles = (comision: Comision) => {
    setDetalleComision(comision);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-12 h-12 mx-auto border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 mt-3">Cargando comisiones...</p>
      </div>
    );
  }

  if (comisiones.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-500">No se encontraron comisiones</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length > 0 &&
                      comisiones.filter((c) => c.estado === "PENDIENTE").length ===
                        selectedIds.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Vendedor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Monto Venta
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Comisión
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comisiones.map((comision) => (
                <tr key={comision.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(comision.id)}
                      onChange={(e) =>
                        handleSelectOne(comision.id, e.target.checked)
                      }
                      disabled={comision.estado !== "PENDIENTE"}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-30"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {comision.vendedor_nombre}
                    </div>
                    {comision.sucursal_nombre && (
                      <div className="text-xs text-gray-500">
                        {comision.sucursal_nombre}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatearFecha(comision.fecha_venta)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {comision.tipo_venta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {formatearMoneda(comision.monto_venta)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm font-bold text-green-600">
                      {formatearMoneda(comision.monto_comision)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {comision.porcentaje_aplicado}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getEstadoBadge(
                        comision.estado
                      )}`}
                    >
                      {comision.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      {/* Solo botón Ver Detalles */}
                      <Tooltip text="Ver detalles" position="top">
                        <button
                          onClick={() => handleVerDetalles(comision)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botón de refrescar en la parte inferior */}
        <div className="border-t border-gray-200 px-4 py-3 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Mostrando {comisiones.length} comisión{comisiones.length !== 1 ? "es" : ""}
          </p>
          <Tooltip text="Refrescar datos" position="left">
            <button
              onClick={onRefresh}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Modal de Detalles Profesional */}
      {detalleComision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 animate-scale-in">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-600"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Detalles de Comisión
                  </h2>
                  <p className="text-xs text-gray-500">ID: #{detalleComision.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetalleComision(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="px-6 py-5">
              {/* Estado Badge */}
              <div className="mb-5">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getEstadoBadge(
                    detalleComision.estado
                  )}`}
                >
                  {detalleComision.estado}
                </span>
              </div>

              {/* Grid de información */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Vendedor */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Vendedor</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {detalleComision.vendedor_nombre}
                  </p>
                </div>

                {/* Sucursal */}
                {detalleComision.sucursal_nombre && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase">Sucursal</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {detalleComision.sucursal_nombre}
                    </p>
                  </div>
                )}

                {/* Tipo de venta */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Tipo de Venta</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {detalleComision.tipo_venta}
                  </p>
                </div>

                {/* Fecha */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Fecha</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatearFecha(detalleComision.fecha_venta)}
                  </p>
                </div>

                {/* Monto Venta */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Monto de Venta</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatearMoneda(detalleComision.monto_venta)}
                  </p>
                </div>

                {/* Porcentaje */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase">Porcentaje Aplicado</p>
                  <p className="text-sm font-bold text-blue-600">
                    {detalleComision.porcentaje_aplicado}%
                  </p>
                </div>
              </div>

              {/* Separador */}
              <div className="my-5 border-t border-gray-200"></div>

              {/* Monto de comisión destacado */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase mb-1">
                      Comisión Generada
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatearMoneda(detalleComision.monto_comision)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-green-700"
                    >
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Referencias adicionales */}
              {(detalleComision.venta_id || detalleComision.pedido_id) && (
                <>
                  <div className="my-5 border-t border-gray-200"></div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Referencias
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detalleComision.venta_id && (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          Venta POS #{detalleComision.venta_id}
                        </span>
                      )}
                      {detalleComision.pedido_id && (
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                          Pedido #{detalleComision.pedido_id}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer del modal */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setDetalleComision(null)}
                className="px-6 py-2 bg-[#b157e0] hover:bg-[#9d4ac4] text-white font-medium rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}