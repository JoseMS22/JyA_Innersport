// frontend/app/admin/comisiones/_components/FiltrosComisiones.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Filtros = {
  vendedor_id: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  tipo_venta: string | null;
};

type FiltrosComisionesProps = {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
};

type Vendedor = {
  id: number;
  nombre: string;
};

export function FiltrosComisiones({ filtros, onChange }: FiltrosComisionesProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [showCustomDates, setShowCustomDates] = useState(false);

  useEffect(() => {
    cargarVendedores();
  }, []);

  const cargarVendedores = async () => {
    try {
      // Asumiendo que tienes un endpoint para listar vendedores
      const data = await apiFetch("/api/v1/usuarios?rol=VENDEDOR");
      setVendedores(data || []);
    } catch (error) {
      console.error("Error cargando vendedores:", error);
    }
  };

  const handlePresetDate = (days: number) => {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - days);

    onChange({
      ...filtros,
      fecha_inicio: inicio.toISOString(),
      fecha_fin: fin.toISOString(),
    });
    setShowCustomDates(false);
  };

  const handleCustomDates = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inicio = formData.get("inicio") as string;
    const fin = formData.get("fin") as string;

    if (inicio && fin) {
      onChange({
        ...filtros,
        fecha_inicio: new Date(inicio).toISOString(),
        fecha_fin: new Date(fin).toISOString(),
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Primera fila: Vendedor, Estado, Tipo Venta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendedor
          </label>
          <select
            value={filtros.vendedor_id || ""}
            onChange={(e) =>
              onChange({
                ...filtros,
                vendedor_id: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={filtros.estado}
            onChange={(e) => onChange({ ...filtros, estado: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="LIQUIDADA">Liquidada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Venta
          </label>
          <select
            value={filtros.tipo_venta || ""}
            onChange={(e) =>
              onChange({
                ...filtros,
                tipo_venta: e.target.value || null,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todos los tipos</option>
            <option value="POS">POS</option>
            <option value="ONLINE">Online</option>
          </select>
        </div>
      </div>

      {/* Segunda fila: Fechas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Período
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handlePresetDate(7)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Última semana
          </button>

          <button
            type="button"
            onClick={() => handlePresetDate(30)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Último mes
          </button>

          <button
            type="button"
            onClick={() => handlePresetDate(90)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Últimos 3 meses
          </button>

          <button
            type="button"
            onClick={() => setShowCustomDates(!showCustomDates)}
            className="px-3 py-1.5 text-sm rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50"
          >
            {showCustomDates ? "Cerrar" : "Personalizado"}
          </button>

          {(filtros.fecha_inicio || filtros.fecha_fin) && (
            <button
              type="button"
              onClick={() =>
                onChange({ ...filtros, fecha_inicio: null, fecha_fin: null })
              }
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Limpiar
            </button>
          )}
        </div>

        {showCustomDates && (
          <form
            onSubmit={handleCustomDates}
            className="flex items-end gap-3 mt-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                name="inicio"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                name="fin"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Aplicar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}