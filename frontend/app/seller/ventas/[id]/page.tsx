// frontend/app/seller/ventas/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SellerMenu } from "@/components/SellerMenu";
import { useToast } from "@/app/context/ToastContext";

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
  tiene_rma_activo?: boolean; // 🆕 Campo necesario para bloquear botón
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

export default function VentaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { showToast } = useToast(); // 🆕 Usamos Toast

  const [venta, setVenta] = useState<VentaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [user, setUser] = useState<UserMe | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadAll() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // /me
        const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
        if (!isMounted) return;
        if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setUser(me);

        // Detalle venta
        const data = (await apiFetch(`/api/v1/pos/ventas/${id}`)) as VentaDetail;

        if (!isMounted) return;
        setVenta(data);
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMsg(err?.message ?? "No se pudo cargar el detalle de la venta.");
        showToast("Error cargando venta", "error"); // 🆕
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [id, router, showToast]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignorar error de logout
    }
    router.push("/login");
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {/* Menú vendedor solo en pantalla */}
      {user && (
        <div className="no-print">
          <SellerMenu user={user} onLogout={handleLogout} />
        </div>
      )}

      {/* Vista normal del detalle (no se imprime) */}
      <main className="no-print flex-1 max-w-5xl mx-auto w-full px-4 py-4 space-y-4">
        <button
          type="button"
          onClick={() => router.push("/seller/ventas")}
          className="text-xs text-gray-600 hover:text-[#6b21a8] mb-2"
        >
          ← Volver al listado de ventas
        </button>

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
            {/* Encabezado + botón imprimir + botón RMA */}
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
                  
                  {/* 🆕 BOTÓN DE RMA (DEVOLUCIÓN) */}
                  {!venta.tiene_rma_activo ? (
                      <button
                        onClick={() => router.push(`/seller/ventas/${id}/rma`)}
                        className="px-3 py-1.5 bg-indigo-600 !text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"></path></svg>
                        Devolución / Cambio
                      </button>
                  ) : (
                      <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-200 flex items-center gap-1">
                          ⚠️ Devolución en proceso
                      </span>
                  )}

                  <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${venta.estado === "COMPLETADA"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        }`}
                    >
                      {venta.estado}
                    </span>
                    
                    {/* Botón imprimir ticket */}
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#e5e7eb] text-gray-700 hover:bg-gray-50 print:hidden"
                    >
                      🧾 Imprimir ticket
                    </button>
                  </div>
                </div>
              </div>
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
                              {item.nombre_producto || `Producto #${item.producto_id}`}
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
        <section className="mt-4 mb-6 flex justify-center">
          {/* Título solo pantalla */}
          <div className="no-print max-w-5xl w-full px-4 mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              Vista previa del ticket
            </h2>
            <p className="text-[11px] text-gray-500">
              Esta es la versión que se imprimirá en la impresora térmica de 80mm.
            </p>
          </div>

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

            {/* Pagos */}
            <div className="ticket-section">
              <div className="ticket-row ticket-row-title">
                <span>Pago</span>
                <span>Monto</span>
              </div>
              {venta.pagos.map((p) => (
                <div
                  key={p.id}
                  className="ticket-row ticket-row-small"
                >
                  <span>
                    {p.metodo}
                    {p.referencia ? ` (${p.referencia})` : ""}
                  </span>
                  <span>{currency.format(Number(p.monto))}</span>
                </div>
              ))}
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
        </section>
      )}
    </div>
  );
}