// frontend/app/seller/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SellerMenu } from "@/components/SellerMenu";
import { Tooltip } from "@/components/ui/tooltip";

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

        const me = (await apiFetch("/api/v1/auth/me")) as UserMe;
        if (!isMounted) return;

        if (me.rol !== "VENDEDOR" && me.rol !== "ADMIN") {
          router.push("/");
          return;
        }
        setUser(me);

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
    <div className="min-h-screen bg-gradient-to-br from-[#fdf6e3] via-[#fef9f3] to-[#fdf2f8] flex flex-col">
      {user && <SellerMenu user={user} onLogout={handleLogout} />}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-8">
        {/* HEADER CON DISEÑO MEJORADO */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#b157e0] via-[#7c3aed] to-[#6b21a8] p-8 shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Punto de venta
                </h1>
                <p className="text-white text-sm">
                  Panel de control para ventas presenciales
                </p>
              </div>
            </div>
            <p className="text-white text-sm max-w-2xl">
              Gestiona tus ventas, caja y sucursales de forma eficiente. Todo lo que necesitas en un solo lugar.
            </p>
          </div>

          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </section>

        {loading && (
          <div className="rounded-3xl border border-purple-200 bg-white/90 backdrop-blur-sm p-8 text-center shadow-lg">
            <div className="inline-flex items-center gap-3 text-purple-600">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-medium">Cargando configuración del POS...</span>
            </div>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="rounded-3xl border border-red-200 bg-red-50/90 backdrop-blur-sm p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Error al cargar</h3>
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !errorMsg && config && (
          <>
            {/* GRID DE CARDS PRINCIPALES */}
            <section className="grid gap-6 lg:grid-cols-[1fr_auto]">
              {/* CAJA ACTUAL - MEJORADA */}
              <div className="rounded-3xl bg-white/90 backdrop-blur-sm border border-purple-100 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                        <svg
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <span>Caja actual</span>
                    </h2>
                    {tieneCajaAbierta ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border-2 border-green-300 shadow-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        ABIERTA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border-2 border-gray-300">
                        <span className="w-2 h-2 bg-gray-400 rounded-full" />
                        CERRADA
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {config.caja_actual ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-4 border border-purple-200">
                          <p className="text-xs font-medium text-purple-600 mb-1">
                            Monto de apertura
                          </p>
                          <p className="text-2xl font-bold text-purple-900">
                            ₡{Number(config.caja_actual.monto_apertura).toLocaleString("es-CR")}
                          </p>
                        </div>
                        {config.caja_actual.monto_teorico_cierre && (
                          <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-4 border border-green-200">
                            <Tooltip text="Monto calculado según las ventas registradas">
                              <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                                Teórico actual
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </p>
                            </Tooltip>
                            <p className="text-2xl font-bold text-green-900">
                              ₡{Number(config.caja_actual.monto_teorico_cierre).toLocaleString("es-CR")}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Abierta el {new Date(config.caja_actual.fecha_apertura).toLocaleString("es-CR", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">No hay caja abierta</h3>
                      <p className="text-sm text-gray-600">
                        Podrás abrir una caja antes de registrar pagos en efectivo
                      </p>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <Tooltip text="Ir al punto de venta">
                      <button
                        type="button"
                        onClick={() => router.push("/seller/pos")}
                        className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#b157e0] via-[#7c3aed] to-[#6b21a8] hover:from-[#a146cf] hover:via-[#6b29dc] hover:to-[#5a1a97] shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* ACCIONES RÁPIDAS - MEJORADA */}
              <div className="lg:w-48 rounded-3xl bg-white/90 backdrop-blur-sm border border-purple-100 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-4 border-b border-purple-100">
                  <h2 className="text-sm font-bold text-gray-900 text-center">
                    <span className="lg:block">Acciones</span>
                    <span className="lg:block lg:text-xs lg:font-normal lg:text-gray-600 lg:mt-1">rápidas</span>
                  </h2>
                </div>

                <div className="p-4 flex lg:flex-col gap-3">
                  <Tooltip text="Iniciar nueva venta" position="bottom">
                    <button
                      type="button"
                      onClick={() => router.push("/seller/pos")}
                      className="w-full lg:w-20 lg:h-20 group relative overflow-hidden inline-flex items-center justify-center px-6 py-4 lg:p-0 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#b157e0] via-[#7c3aed] to-[#6b21a8] hover:from-[#a146cf] hover:via-[#6b29dc] hover:to-[#5a1a97] shadow-lg shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl lg:mx-auto"
                    >
                      <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </Tooltip>

                  <Tooltip text="Ver historial de ventas" position="bottom">
                    <button
                      type="button"
                      onClick={() => router.push("/seller/ventas")}
                      className="w-full lg:w-20 lg:h-20 group inline-flex items-center justify-center px-6 py-3 lg:p-0 rounded-2xl text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 transition-all duration-200 lg:mx-auto"
                    >
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              </div>
            </section>

            {/* SUCURSALES ASIGNADAS - MEJORADA */}
            <section className="rounded-3xl bg-white/90 backdrop-blur-sm border border-purple-100 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-purple-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span>Sucursales asignadas</span>
                  </h2>
                  <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                    {config.sucursales.length} {config.sucursales.length === 1 ? 'sucursal' : 'sucursales'}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {config.sucursales.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Sin sucursales asignadas</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                      No tienes sucursales asignadas para vender. Solicita a un administrador que te asigne una sucursal.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Podrás vender usando el inventario de estas sucursales
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {config.sucursales.map((s) => {
                        const active = s.id === selectedSucursalId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelectedSucursalId(s.id)}
                            className={`group relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${active
                                ? "border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg scale-[1.02]"
                                : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/50 hover:scale-[1.01]"
                              }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className={`p-2 rounded-xl ${active ? "bg-purple-100" : "bg-gray-100 group-hover:bg-purple-50"
                                }`}>
                                <svg className={`w-4 h-4 ${active ? "text-purple-600" : "text-gray-500 group-hover:text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              {active && (
                                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <h3 className={`font-bold text-sm mb-1 ${active ? "text-purple-900" : "text-gray-900"
                              }`}>
                              {s.nombre}
                            </h3>
                            {s.provincia && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {s.provincia}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {sucursalSeleccionada && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
                        <p className="text-sm text-gray-700 flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Sucursal seleccionada:{" "}
                            <span className="font-bold text-purple-900">
                              {sucursalSeleccionada.nombre}
                            </span>
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* INFO DEL USUARIO - MEJORADA */}
            <section className="rounded-2xl bg-gradient-to-r from-purple-100/50 to-pink-100/50 border border-purple-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {config.nombre_usuario.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
                    <span>Operando como</span>
                    <span className="font-bold text-purple-900 bg-white px-3 py-1 rounded-full shadow-sm">
                      {config.nombre_usuario}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-600 text-white shadow-sm">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {config.rol || "VENDEDOR"}
                    </span>
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}