// frontend/app/seller/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SellerMenu } from "@/components/SellerMenu";

type SucursalPOS = {
  id: number;
  nombre: string;
  activo: boolean;
  provincia?: string | null;
};

type CajaTurno = {
  id: number;
  usuario_id: number;
  monto_apertura: string;
  monto_teorico_cierre?: string | null;
  monto_real_cierre?: string | null;
  diferencia?: string | null;
  estado: "ABIERTA" | "CERRADA";
  observaciones?: string | null;
  fecha_apertura: string;
  fecha_cierre?: string | null;
};

type POSConfig = {
  usuario_id: number;
  nombre_usuario: string;
  rol: string;
  sucursales: SucursalPOS[];
  caja_actual: CajaTurno | null;
};

type UserMe = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export default function SellerHomePage() {
  const router = useRouter();

  const [config, setConfig] = useState<POSConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(
    null
  );

  const [user, setUser] = useState<UserMe | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAll() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1) /me para saber quién es (seguridad básica)
        const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
        if (!isMounted) return;

        if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setUser(me);

        // 2) config POS
        const data = (await apiFetch("/api/v1/pos/config")) as POSConfig;
        if (!isMounted) return;

        setConfig(data);
        if (data.sucursales.length > 0) {
          setSelectedSucursalId(data.sucursales[0].id);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.status === 401) {
          router.push("/login");
          return;
        }
        setErrorMsg(
          err?.message ||
            "No se pudo cargar la configuración del POS. Intenta de nuevo."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignoramos error de logout
    } finally {
      router.push("/login");
    }
  }

  const sucursalSeleccionada = config?.sucursales.find(
    (s) => s.id === selectedSucursalId
  );

  const tieneCajaAbierta =
    config?.caja_actual && config.caja_actual.estado === "ABIERTA";

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {user && (
        <SellerMenu
          user={user}
          onLogout={handleLogout}
        />
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {/* HEADER */}
        <section>
          <h1 className="text-2xl font-bold text-[#6b21a8]">
            Punto de venta (POS)
          </h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Aquí vas a gestionar las ventas en tienda física, tu caja y las
            sucursales donde tienes permiso para vender.
          </p>
        </section>

        {loading && (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white/90 p-4 text-sm text-gray-600">
            Cargando configuración del POS...
          </div>
        )}

        {!loading && errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && config && (
          <>
            {/* BLOQUE DE RESUMEN */}
            <section className="grid gap-4 md:grid-cols-3">
              {/* Caja actual */}
              <div className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span>Caja actual</span>
                    {tieneCajaAbierta ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                        ABIERTA
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                        CERRADA
                      </span>
                    )}
                  </h2>

                  {config.caja_actual ? (
                    <div className="mt-2 space-y-1 text-xs text-gray-600">
                      <p>
                        <span className="font-medium text-gray-700">
                          Apertura:
                        </span>{" "}
                        ₡
                        {Number(
                          config.caja_actual.monto_apertura
                        ).toLocaleString("es-CR")}
                      </p>
                      {config.caja_actual.monto_teorico_cierre && (
                        <p>
                          <span className="font-medium text-gray-700">
                            Teórico actual:
                          </span>{" "}
                          ₡
                          {Number(
                            config.caja_actual.monto_teorico_cierre
                          ).toLocaleString("es-CR")}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-500">
                        Abierta el{" "}
                        {new Date(
                          config.caja_actual.fecha_apertura
                        ).toLocaleString("es-CR")}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      No tienes una caja abierta en este momento. Podrás abrir
                      una caja antes de registrar pagos en efectivo.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/seller/pos")}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#6b21a8] hover:bg-[#5b21a5] shadow-sm"
                  >
                    Ir al POS
                  </button>
                </div>
              </div>

              {/* Sucursales asignadas */}
              <div className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4">
                <h2 className="text-sm font-semibold text-gray-800">
                  Sucursales asignadas
                </h2>
                {config.sucursales.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">
                    No tienes sucursales asignadas para vender. Pide a un
                    administrador que te asigne una sucursal.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Podrás vender usando el inventario de estas sucursales.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {config.sucursales.map((s) => {
                        const active = s.id === selectedSucursalId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedSucursalId(s.id)}
                            className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                              active
                                ? "border-[#a855f7] bg-[#f5f3ff] text-[#6b21a8] shadow-sm"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <span className="font-medium">{s.nombre}</span>
                            {s.provincia && (
                              <span className="ml-1 text-[10px] text-gray-400">
                                · {s.provincia}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {sucursalSeleccionada && (
                      <p className="mt-3 text-[11px] text-gray-500">
                        Sucursal seleccionada para la próxima venta:{" "}
                        <span className="font-semibold text-[#6b21a8]">
                          {sucursalSeleccionada.nombre}
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Acciones rápidas */}
              <div className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    Acciones rápidas
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Comienza una venta rápida, ideal para mostrador.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => router.push("/seller/pos")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#a855f7] hover:bg-[#9333ea] shadow-sm"
                  >
                    <span>Iniciar nueva venta</span>
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12h14M13 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/seller/ventas")}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium text-[#6b21a8] border border-[#e5e7eb] hover:border-[#a855f7]/50 hover:bg-[#f9f5ff]"
                  >
                    Ver ventas
                  </button>
                </div>
              </div>
            </section>

            {/* RESUMEN DEL USUARIO POS */}
            <section className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4 text-xs text-gray-600">
              <p>
                Estás usando el POS como{" "}
                <span className="font-semibold text-[#6b21a8]">
                  {config.nombre_usuario}
                </span>{" "}
                ({config.rol || "VENDEDOR"}).
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
