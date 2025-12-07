// frontend/app/admin/dashboard/_components/DesempenoVendedores.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

type Filtros = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sucursal_id: number | null;
};

type Vendedor = {
  vendedor_id: number;
  nombre: string;
  ventas_totales: number;
  cantidad_ventas: number;
  ticket_promedio: number;
  comisiones_generadas: number;
  comisiones_pendientes: number;
  comisiones_liquidadas: number;
  ranking: number;
};

type DesempenoVendedoresProps = {
  filtros: Filtros;
};

export function DesempenoVendedores({ filtros }: DesempenoVendedoresProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarVendedores();
  }, [filtros]);

  const cargarVendedores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
      if (filtros.sucursal_id) params.append("sucursal_id", String(filtros.sucursal_id));

      const data = await apiFetch(`/api/v1/dashboard/desempeno-vendedores?${params}`);
      setVendedores(data.vendedores || []);
    } catch (error) {
      console.error("Error cargando vendedores:", error);
    } finally {
      setLoading(false);
    }
  };

  const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#6b21a8]">
          Desempeño de Vendedores
        </h3>
        <Link
          href="/admin/comisiones"
          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
        >
          Ver comisiones →
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : vendedores.length > 0 ? (
        <div className="space-y-4">
          {vendedores.slice(0, 5).map((vendedor) => (
            <div
              key={vendedor.vendedor_id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                #{vendedor.ranking}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{vendedor.nombre}</div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                  <div className="text-xs">
                    <span className="text-gray-500">Ventas:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {currency.format(vendedor.ventas_totales)}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-gray-500">Tickets:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {vendedor.cantidad_ventas}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-gray-500">Ticket Prom:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {currency.format(vendedor.ticket_promedio)}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-gray-500">Comisiones:</span>{" "}
                    <span className="font-medium text-purple-600">
                      {currency.format(vendedor.comisiones_generadas)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                  <div className="text-[10px]">
                    <span className="text-gray-500">Pendiente:</span>{" "}
                    <span className="font-medium text-orange-600">
                      {currency.format(vendedor.comisiones_pendientes)}
                    </span>
                  </div>

                  <div className="text-[10px]">
                    <span className="text-gray-500">Liquidada:</span>{" "}
                    <span className="font-medium text-green-600">
                      {currency.format(vendedor.comisiones_liquidadas)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          No hay datos de vendedores para mostrar
        </div>
      )}
    </div>
  );
}