// frontend/components/dashboard/DateRangePicker.tsx
"use client";

import { useState } from "react";

type DateRangePickerProps = {
  value: {
    inicio: string | null;
    fin: string | null;
  };
  onChange: (inicio: string | null, fin: string | null) => void;
};

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  const presets = [
    { label: "Hoy", days: 0 },
    { label: "Última semana", days: 7 },
    { label: "Último mes", days: 30 },
    { label: "Últimos 3 meses", days: 90 },
  ];

  const handlePreset = (days: number) => {
    if (days === 0) {
      const today = new Date();
      const todayStr = today.toISOString();
      onChange(todayStr, todayStr);
    } else {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - days);
      onChange(inicio.toISOString(), fin.toISOString());
    }
    setShowCustom(false);
  };

  const handleCustom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inicio = formData.get("inicio") as string;
    const fin = formData.get("fin") as string;

    if (inicio && fin) {
      const inicioDate = new Date(inicio);
      const finDate = new Date(fin);
      onChange(inicioDate.toISOString(), finDate.toISOString());
    }
  };

  const clearFilter = () => {
    onChange(null, null);
    setShowCustom(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Período:</span>

        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePreset(preset.days)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {preset.label}
          </button>
        ))}

        <button
          onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-1.5 text-xs rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 transition-colors"
        >
          {showCustom ? "Cerrar" : "Personalizado"}
        </button>

        {(value.inicio || value.fin) && (
          <button
            onClick={clearFilter}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {showCustom && (
        <form onSubmit={handleCustom} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
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
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Aplicar
          </button>
        </form>
      )}

      {value.inicio && value.fin && !showCustom && (
        <div className="text-xs text-gray-600">
          Mostrando datos desde {new Date(value.inicio).toLocaleDateString("es-CR")} hasta{" "}
          {new Date(value.fin).toLocaleDateString("es-CR")}
        </div>
      )}
    </div>
  );
}