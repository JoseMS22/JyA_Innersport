// frontend/app/seller/ventas/[id]/page.tsx
"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SellerMenu } from "@/components/SellerMenu";
import { useNotifications } from "@/app/context/NotificationContext";
import { Tooltip } from "@/components/ui/tooltip";

type VentaItem = {
  id: number;
  variante_id: number;
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
};

type PagoPOS = {
  id: number;
  metodo: string;
  monto: string;
  referencia?: string | null;
  fecha: string;
};

interface RMA {
  id: number;
  tipo: string;
  estado: string;
  motivo: string;
  respuesta_admin?: string;
  fecha: string;
}

type VentaDetail = {
  id: number;
  sucursal_id: number;
  sucursal_nombre: string;
  vendedor_id: number;
  vendedor_nombre: string;
  cliente_id?: number | null;
  nombre_cliente_ticket?: string | null;
  subtotal: string;
  descuento_puntos: string;
  impuesto: string;
  total: string;
  puntos_ganados: number;
  estado: string;
  fecha_creacion: string;
  items: VentaItem[];
  pagos: PagoPOS[];
  tiene_rma_activo?: boolean;
  solicitudes_rma?: RMA[];
};

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

const IVA_RATE = 0.13;
const FACTOR_IVA = 1 + IVA_RATE;

function precioConIVADesdeBase(base: number) {
  return Math.round(base * FACTOR_IVA * 100) / 100;
}

const ESTADOS_RMA_POS = {
  solicitado: { label: "Solicitud Recibida", color: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  en_revision: { label: "En Revisión", color: "bg-blue-50 text-blue-800 border-blue-200" },
  aprobado: { label: "✅ Aprobada", color: "bg-green-50 text-green-800 border-green-200" },
  rechazado: { label: "❌ Rechazada", color: "bg-red-50 text-red-800 border-red-200" },
  completado: { label: "Devolución Completada", color: "bg-gray-50 text-gray-800 border-gray-200" },
};

function getEstadoChipClasses(estado: string): string {
  switch (estado) {
    case "PAGADO":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "ENTREGADO":
      return "bg-green-50 text-green-700 border border-green-200";
    case "CANCELADO":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

export default function VentaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { success, error: showError } = useNotifications();

  const [venta, setVenta] = useState<VentaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserMe | null>(null);

  const [estadoLocal, setEstadoLocal] = useState<string>("");
  const [savingEstado, setSavingEstado] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadAll() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
        if (!isMounted) return;
        if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setUser(me);

        const data = (await apiFetch(`/api/v1/pos/ventas/${id}`)) as VentaDetail;

        if (!isMounted) return;
        setVenta(data);
        setEstadoLocal(data.estado);
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMsg(err?.message ?? "No se pudo cargar el detalle de la venta.");
        showError("Error al cargar", "No se pudo cargar el detalle de la venta.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [id, router, showError]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
    }
    router.push("/login");
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  async function handleCambiarEstado(e: React.FormEvent) {
    e.preventDefault();
    if (!venta) return;

    try {
      setSavingEstado(true);

      await apiFetch(`/api/v1/pos/ventas/${venta.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: estadoLocal }),
      });

      setVenta((prev) =>
        prev ? { ...prev, estado: estadoLocal } : prev
      );
      success("Estado actualizado", "El estado de la venta se actualizó correctamente.");
    } catch (err: any) {
      showError(
        "Error al actualizar",
        err?.message ?? "No se pudo actualizar el estado de la venta."
      );
    } finally {
      setSavingEstado(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {user && (
        <div className="no-print">
          <SellerMenu user={user} onLogout={handleLogout} />
        </div>
      )}

      <main className="no-print flex-1 max-w-5xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center py-3 gap-2 mb-4 text-sm flex-wrap">
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
            onClick={() => router.push("/seller/pos")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            POS
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push("/seller/ventas")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Ventas
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Venta #{id}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Cargando detalle de venta...</p>
        ) : errorMsg ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMsg}
          </div>
        ) : !venta ? (
          <p className="text-sm text-gray-500">
            No se encontró la venta solicitada.
          </p>
        ) : (
          <>
            {/* Encabezado + botones con tooltips */}
            <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold text-[#6b21a8]">
                    Venta #{venta.id}
                  </h1>
                  <p className="text-xs text-gray-600">
                    Sucursal:{" "}
                    <span className="font-semibold">
                      {venta.sucursal_nombre}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600">
                    Fecha:{" "}
                    {new Date(venta.fecha_creacion).toLocaleString("es-CR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  {/* Botón RMA con tooltip */}
                  {!venta.tiene_rma_activo ? (
                    <Tooltip text="Gestionar devolución o cambio" position="bottom">
                      <button
                        onClick={() => router.push(`/seller/ventas/${id}/rma`)}
                        className="p-2 bg-indigo-600 !text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                        </svg>
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-200 flex items-center gap-1">
                      ⚠️ Devolución en proceso
                    </span>
                  )}

                  <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getEstadoChipClasses(
                        venta.estado
                      )}`}
                    >
                      {venta.estado}
                    </span>

                    {/* Botón imprimir con tooltip */}
                    <Tooltip text="Imprimir ticket" position="bottom">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="p-2 rounded-lg border border-[#e5e7eb] text-gray-700 hover:bg-gray-50 print:hidden transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </section>

            {/* Historial RMA */}
            {venta.solicitudes_rma && venta.solicitudes_rma.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-800">Historial de Devoluciones</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {venta.solicitudes_rma.map((rma) => {
                    const config = ESTADOS_RMA_POS[rma.estado as keyof typeof ESTADOS_RMA_POS] || { label: rma.estado, color: "bg-gray-100" };
                    return (
                      <div key={rma.id} className={`p-3 rounded-lg border ${config.color}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs uppercase">{config.label}</span>
                          <span className="text-[10px] opacity-70">{new Date(rma.fecha).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs mb-1 font-medium">{rma.tipo === 'devolucion' ? 'Reembolso' : 'Cambio'}</p>
                        <p className="text-xs mb-1 text-gray-700"><strong>Motivo:</strong> {rma.motivo}</p>

                        {rma.respuesta_admin && (
                          <div className="mt-2 bg-white/60 p-2 rounded text-xs border border-black/5">
                            <strong>Resolución:</strong>
                            <p className="mt-1 italic">{rma.respuesta_admin}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Panel estado de venta */}
            <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Estado de la venta
              </h2>
              <form onSubmit={handleCambiarEstado} className="space-y-2">
                <div>
                  <label className="block mb-1 text-gray-700 text-xs font-semibold">
                    Estado actual
                  </label>
                  <select
                    value={estadoLocal}
                    onChange={(e) => setEstadoLocal(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-[#a855f7] text-xs"
                  >
                    <option value="PAGADO">PAGADO (pago registrado)</option>
                    <option value="ENTREGADO">ENTREGADO (cliente recibió)</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-500">
                  Cambia el estado de la venta para indicar si está pagada,
                  entregada al cliente o cancelada.
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingEstado}
                    className="px-3 py-1.5 rounded-full 
                      bg-[#f5f3ff] text-[#6b21a8] 
                      border border-[#a855f7]/40 
                      shadow-sm text-xs font-semibold
                      hover:bg-[#ede9fe]
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingEstado ? "Guardando..." : "Actualizar estado"}
                  </button>
                </div>
              </form>
            </section>

            {/* Items + totales */}
            <section className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  Productos
                </h2>
                {venta.items.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No se registraron productos en esta venta.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {venta.items.map((item) => {
                      const precioBase = Number(item.precio_unitario);
                      const precioConIVA = precioConIVADesdeBase(precioBase);

                      return (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2 last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">
                              {item.nombre_producto ||
                                `Producto #${item.producto_id}`}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Precio base: {currency.format(precioBase)} (sin IVA)
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Precio con IVA: {currency.format(precioConIVA)} c/u
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Cantidad: {item.cantidad}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-gray-500">Subtotal</p>
                            <p className="text-sm font-semibold text-[#6b21a8]">
                              {currency.format(Number(item.subtotal))}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Totales
                </h2>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{currency.format(Number(venta.subtotal))}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Descuento por puntos</span>
                  <span>
                    -{currency.format(Number(venta.descuento_puntos))}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA (13%)</span>
                  <span>{currency.format(Number(venta.impuesto))}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2 mt-1">
                  <span>Total</span>
                  <span className="text-[#6b21a8]">
                    {currency.format(Number(venta.total))}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Puntos ganados:{" "}
                  <span className="font-semibold">
                    {venta.puntos_ganados}
                  </span>
                </p>
              </div>
            </section>

            {/* Pagos */}
            <section className="bg-white rounded-2xl border border-[#e5e7eb] p-4 shadow-sm text-xs space-y-2">
              <h2 className="text-sm font-semibold text-gray-800 mb-2">
                Pagos
              </h2>
              {venta.pagos.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No se registraron pagos para esta venta.
                </p>
              ) : (
                <div className="space-y-2">
                  {venta.pagos.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-gray-100 pb-2 last:border-b-0"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {p.metodo}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Fecha:{" "}
                          {new Date(p.fecha).toLocaleString("es-CR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                        {p.referencia && (
                          <p className="text-[11px] text-gray-500">
                            Ref: {p.referencia}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-500">Monto</p>
                        <p className="text-sm font-semibold text-[#6b21a8]">
                          {currency.format(Number(p.monto))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Vista de ticket (se imprime SOLO esto) */}
      {venta && (
        <section className="mt-4 mb-6">
          <div className="max-w-5xl mx-auto w-full px-4">
            {/* Título solo pantalla */}
            <div className="no-print mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Vista previa del ticket
              </h2>
              <p className="text-[11px] text-gray-500">
                Esta es la versión que se imprimirá en la impresora térmica de 80mm.
              </p>
            </div>

            {/* Ticket centrado */}
            <div className="flex justify-center">
              <div className="ticket">
                {/* Encabezado tienda */}
                <div className="ticket-header">
                  <div className="ticket-store-name">JyA Innersport</div>
                  <div className="ticket-store-sub">
                    Ropa deportiva y ropa interior
                  </div>
                  <div className="ticket-store-info">
                    Cédula Jurídica: 3-101-000000
                    <br />
                    Tel: 8888-8888 · San José, Costa Rica
                  </div>
                  <div className="ticket-separator" />
                </div>

                {/* Datos de la venta */}
                <div className="ticket-section">
                  <div className="ticket-row">
                    <span>Factura:</span>
                    <span>#{venta.id}</span>
                  </div>
                  <div className="ticket-row">
                    <span>Fecha:</span>
                    <span>
                      {new Date(venta.fecha_creacion).toLocaleString("es-CR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="ticket-row">
                    <span>Sucursal:</span>
                    <span>{venta.sucursal_nombre}</span>
                  </div>
                  <div className="ticket-row">
                    <span>Vendedor:</span>
                    <span>{venta.vendedor_nombre}</span>
                  </div>
                  <div className="ticket-row">
                    <span>Cliente:</span>
                    <span>{venta.nombre_cliente_ticket || "Anónimo"}</span>
                  </div>
                  <div className="ticket-separator" />
                </div>

                {/* Detalle de productos */}
                <div className="ticket-section">
                  <div className="ticket-row ticket-row-title">
                    <span>Descripción</span>
                    <span>Cant</span>
                    <span>Importe</span>
                  </div>
                  {venta.items.map((item) => {
                    const precioBase = Number(item.precio_unitario);
                    const precioConIVA = precioConIVADesdeBase(precioBase);

                    return (
                      <div key={item.id} className="ticket-item">
                        <div className="ticket-item-name">
                          {item.nombre_producto || `Producto #${item.producto_id}`}
                        </div>
                        <div className="ticket-item-line">
                          <span>{currency.format(precioConIVA)} c/u</span>
                          <span>x{item.cantidad}</span>
                          <span>{currency.format(Number(item.subtotal))}</span>
                        </div>
                        <div className="ticket-item-line ticket-row-small">
                          <span>Base sin IVA: {currency.format(precioBase)}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="ticket-separator" />
                </div>

                {/* Totales */}
                <div className="ticket-section">
                  <div className="ticket-row">
                    <span>Subtotal</span>
                    <span>{currency.format(Number(venta.subtotal))}</span>
                  </div>
                  <div className="ticket-row">
                    <span>Desc. puntos</span>
                    <span>
                      -{currency.format(Number(venta.descuento_puntos))}
                    </span>
                  </div>
                  <div className="ticket-row">
                    <span>IVA (13%)</span>
                    <span>{currency.format(Number(venta.impuesto))}</span>
                  </div>
                  <div className="ticket-row ticket-row-total">
                    <span>Total</span>
                    <span>{currency.format(Number(venta.total))}</span>
                  </div>
                  <div className="ticket-row ticket-row-small">
                    <span>Puntos ganados:</span>
                    <span>{venta.puntos_ganados}</span>
                  </div>
                  <div className="ticket-separator" />
                </div>

                {/* Footer */}
                <div className="ticket-footer">
                  <div>¡Gracias por su compra!</div>
                  <div>Síguenos en Instagram: @jyainnersport</div>
                  <div className="ticket-footer-note">
                    Cambios dentro de 8 días con factura física.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
