// frontend/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useNotifications } from "@/app/context/NotificationContext";
import { MetricCard } from "./_components/MetricCard";
import { VentasChart } from "./_components/VentasChart";
import { TopProductos } from "./_components/TopProductos";
import { AlertasInventario } from "./_components/AlertasInventario";
import { DesempenoVendedores } from "./_components/DesempenoVendedores";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { RefreshIndicator } from "@/components/dashboard/RefreshIndicator";

type Filtros = {
  fecha_inicio: string | null;
  fecha_fin: string | null;
  sucursal_id: number | null;
};

type Metricas = {
  ventas_totales: {
    monto: number;
    cantidad: number;
    variacion_porcentual: number;
  };
  pedidos_activos: {
    total: number;
    por_estado: Record<string, number>;
  };
  ticket_promedio: number;
  ventas_por_canal: Record<string, number>;
  ultima_actualizacion: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { error } = useNotifications();

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const [filtros, setFiltros] = useState<Filtros>({
    fecha_inicio: null,
    fecha_fin: null,
    sucursal_id: null,
  });

  // Función para cargar métricas
  const cargarMetricas = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append("fecha_inicio", filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append("fecha_fin", filtros.fecha_fin);
      if (filtros.sucursal_id) params.append("sucursal_id", String(filtros.sucursal_id));

      const data = await apiFetch(`/api/v1/dashboard/metricas?${params}`);
      setMetricas(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error("Error cargando métricas:", err);
      error("Error al cargar", err?.message || "No se pudieron cargar las métricas del dashboard");

      if (err?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar métricas iniciales
  useEffect(() => {
    cargarMetricas();
  }, [filtros]);

  // Auto-refresh cada 15 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      cargarMetricas();
    }, 15000); // 15 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, filtros]);

  const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#6b21a8]">
            Dashboard Administrativo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Métricas en tiempo real y análisis de desempeño
          </p>
        </div>

        <div className="flex items-center gap-3">
          <RefreshIndicator
            lastUpdate={lastUpdate}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            onManualRefresh={cargarMetricas}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <DateRangePicker
          value={{
            inicio: filtros.fecha_inicio,
            fin: filtros.fecha_fin,
          }}
          onChange={(inicio, fin) => {
            setFiltros({ ...filtros, fecha_inicio: inicio, fecha_fin: fin });
          }}
        />
      </div>

      {/* Métricas Principales */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 mt-3">Cargando métricas...</p>
        </div>
      ) : metricas ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Ventas Totales"
              value={currency.format(metricas.ventas_totales.monto)}
              subtitle={`${metricas.ventas_totales.cantidad} transacciones`}
              trend={metricas.ventas_totales.variacion_porcentual}
              icon="💰"
            />

            <MetricCard
              title="Pedidos Activos"
              value={metricas.pedidos_activos.total.toString()}
              subtitle="En proceso"
              icon="📦"
            />

            <MetricCard
              title="Ticket Promedio"
              value={currency.format(metricas.ticket_promedio)}
              icon="🧾"
            />

            <MetricCard
              title="Canal POS"
              value={currency.format(metricas.ventas_por_canal.POS || 0)}
              subtitle="Ventas en tienda"
              icon="🏪"
            />
          </div>

          {/* Gráficas y Tablas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VentasChart filtros={filtros} />
            <TopProductos filtros={filtros} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertasInventario filtros={filtros} />
            <DesempenoVendedores filtros={filtros} />
          </div>
        </>
      ) : null}
    </div>
  );
}