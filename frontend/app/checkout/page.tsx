// frontend/app/checkout/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { useCart } from "../context/cartContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type Direccion = {
  id: number;
  nombre: string | null;
  pais: string;
  provincia: string;
  canton: string;
  distrito: string;
  detalle: string;
  codigo_postal: string | null;
  telefono: string | null;
  referencia: string | null;
  predeterminada: boolean;
  activa: boolean;
  created_at: string;
};

type MetodoEnvio = {
  metodo_envio_id: number;
  metodo_nombre: string;
  costo: number;
  dias_entrega_min: number;
  dias_entrega_max: number;
  fecha_estimada_min: string;
  fecha_estimada_max: string;
  descripcion: string | null;
};

type NuevaDireccionForm = {
  nombre: string;
  provincia: string;
  canton: string;
  distrito: string;
  detalle: string;
  telefono: string;
  referencia: string;
  predeterminada: boolean;
};

type LimitePuntos = {
  puede_usar_puntos: boolean;
  motivo: string | null;
  descuento_maximo_colones: number;
  puntos_necesarios_para_maximo: number;
  saldo_puntos: number;
};

type ToastState =
  | {
    type: "success" | "warning";
    title: string;
    message: string;
  }
  | null;

const PROVINCIAS = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  // IVA Costa Rica (ajusta si usas otro)
  const TAX_RATE = 0.13;

  // Si "total" YA incluye impuesto, sacamos el impuesto y el subtotal sin impuesto
  const subtotalSinImpuesto = total / (1 + TAX_RATE);
  const impuestoTotal = total - subtotalSinImpuesto;


  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] =
    useState<Direccion | null>(null);
  const [metodosEnvio, setMetodosEnvio] = useState<MetodoEnvio[]>([]);
  const [metodoSeleccionado, setMetodoSeleccionado] =
    useState<MetodoEnvio | null>(null);

  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Puntos
  const [puntosDisponibles, setPuntosDisponibles] = useState<number>(0);
  const [puntosUsados, setPuntosUsados] = useState<number>(0);
  const [descuento, setDescuento] = useState<number>(0);
  const [limitePuntos, setLimitePuntos] = useState<LimitePuntos | null>(null);

  const [nuevaDireccion, setNuevaDireccion] = useState<NuevaDireccionForm>({
    nombre: "",
    provincia: "",
    canton: "",
    distrito: "",
    detalle: "",
    telefono: "",
    referencia: "",
    predeterminada: false,
  });

  // Bloquear botón mientras se procesa el pedido
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Toast bonito
  const [toast, setToast] = useState<ToastState>(null);

  // ========= 1) Verificar sesión y cargar datos iniciales =========
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        router.push("/login?redirect=/checkout");
        return;
      }

      setIsLoggedIn(true);

      // Cargar datos del usuario
      await Promise.all([cargarDirecciones(), cargarSaldoPuntos()]);
    } catch (err) {
      router.push("/login?redirect=/checkout");
    }
  }

  // ========= 2) Cargar saldo de puntos =========
  async function cargarSaldoPuntos() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/puntos/me/saldo`, {
        credentials: "include",
      });

      if (!res.ok) return;

      const data = await res.json();
      setPuntosDisponibles(data.saldo || 0);
    } catch (err) {
      console.error("Error al cargar saldo de puntos", err);
    }
  }

  // ========= 3) Cargar direcciones =========
  async function cargarDirecciones() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/v1/direcciones/`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Error cargando direcciones");
      }

      const data = await res.json();
      setDirecciones(data);

      // Seleccionar predeterminada automáticamente
      const predeterminada = data.find((d: Direccion) => d.predeterminada);
      if (predeterminada) {
        setDireccionSeleccionada(predeterminada);
        await calcularEnvio(predeterminada.id);
      }
    } catch (err: any) {
      setError(err.message || "No se pudieron cargar las direcciones");
    } finally {
      setLoading(false);
    }
  }

  // ========= 4) Calcular métodos de envío =========
  async function calcularEnvio(direccionId: number) {
    try {
      setCalculando(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/v1/envio/calcular?direccion_id=${direccionId}&peso_kg=1`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error("Error calculando envío");
      }

      const data = await res.json();
      setMetodosEnvio(data);

      // Seleccionar el más económico por defecto
      if (data.length > 0) {
        setMetodoSeleccionado(data[0]);
      }
    } catch (err: any) {
      setError(err.message || "No se pudo calcular el costo de envío");
      setMetodosEnvio([]);
    } finally {
      setCalculando(false);
    }
  }

  async function handleSeleccionarDireccion(direccion: Direccion) {
    setDireccionSeleccionada(direccion);
    setMetodoSeleccionado(null);
    await calcularEnvio(direccion.id);
  }

  // ========= 5) Crear nueva dirección =========
  async function handleCrearDireccion() {
    if (
      !nuevaDireccion.provincia ||
      !nuevaDireccion.canton ||
      !nuevaDireccion.distrito ||
      !nuevaDireccion.detalle
    ) {
      setError("Por favor completa todos los campos obligatorios (*)");
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/v1/direcciones/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaDireccion),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Error creando dirección");
      }

      await cargarDirecciones();

      setMostrarFormulario(false);
      setNuevaDireccion({
        nombre: "",
        provincia: "",
        canton: "",
        distrito: "",
        detalle: "",
        telefono: "",
        referencia: "",
        predeterminada: false,
      });
    } catch (err: any) {
      setError(err.message || "No se pudo crear la dirección");
    } finally {
      setGuardando(false);
    }
  }

  // ========= 6) Calcular límite de puntos en función del total de la compra =========
  async function calcularLimitePuntos(totalCompra: number) {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/puntos/me/limite-redencion?total_compra=${totalCompra}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        setLimitePuntos(null);
        setPuntosUsados(0);
        setDescuento(0);
        return;
      }

      const data = await res.json();

      const limite: LimitePuntos = {
        puede_usar_puntos: data.puede_usar_puntos,
        motivo: data.motivo,
        descuento_maximo_colones: Number(data.descuento_maximo_colones),
        puntos_necesarios_para_maximo: data.puntos_necesarios_para_maximo,
        saldo_puntos: data.saldo_puntos,
      };

      setLimitePuntos(limite);
      setPuntosDisponibles(limite.saldo_puntos || 0);

      if (!limite.puede_usar_puntos) {
        setPuntosUsados(0);
        setDescuento(0);
        return;
      }

      setPuntosUsados(0);
      setDescuento(0);
    } catch (error) {
      console.error("Error calculando límite de puntos", error);
      setLimitePuntos(null);
      setPuntosUsados(0);
      setDescuento(0);
    }
  }

  // ========= 7) Recalcular límite de puntos cuando haya dirección + envío =========
  useEffect(() => {
    if (direccionSeleccionada && metodoSeleccionado) {
      const totalCompra =
        total + Number(metodoSeleccionado?.costo ?? 0); // subtotal + envío
      if (totalCompra > 0) {
        calcularLimitePuntos(totalCompra);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direccionSeleccionada, metodoSeleccionado, total]);

  // ========= 8) Confirmar pedido (simulado) + crear Pedido real =========
  async function handleContinuarPago() {
    if (!direccionSeleccionada || !metodoSeleccionado) {
      setError("Por favor selecciona una dirección y método de envío");
      return;
    }

    if (items.length === 0) {
      setError("Tu carrito está vacío");
      return;
    }

    try {
      setProcesandoPago(true);
      setError(null);

      // 1️⃣ Crear Pedido real en el backend
      const resPedido = await fetch(`${API_BASE}/api/v1/pedidos/checkout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          direccion_envio_id: direccionSeleccionada.id,
          metodo_pago: "SIMULADO",
          metodo_envio: metodoSeleccionado?.metodo_nombre,
        }),
      });

      if (!resPedido.ok) {
        const errData = await resPedido.json().catch(() => null);
        console.error("Error creando pedido:", errData);
        setError(
          errData?.detail ||
          "No se pudo crear el pedido. Intenta de nuevo en unos minutos."
        );
        return;
      }

      const pedido = await resPedido.json(); // PedidoRead

      // 2️⃣ Confirmar compra y procesar puntos (SIEMPRE, aunque puntosUsados sea 0)
      let dataPuntos: any = null;
      let huboErrorPuntos = false;

      try {
          const resPuntos = await fetch(
            `${API_BASE}/api/v1/puntos/me/confirmar-compra`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                // Enviar subtotal (productos) y costo_envio por separado
                subtotal: Number(pedido.subtotal ?? total),
                costo_envio: Number(pedido.costo_envio ?? metodoSeleccionado.costo),
                puntos_a_usar: puntosUsados, // puede ser 0
                order_id: pedido.id, // enlazar movimiento con el pedido creado
              }),
            }
          );

        if (!resPuntos.ok) {
          const err = await resPuntos.json().catch(() => null);
          console.error("Error al confirmar puntos:", err);
          huboErrorPuntos = true;
          setToast({
            type: "warning",
            title: "Pedido creado, pero hubo un detalle",
            message:
              "Tu pedido se registró correctamente, pero ocurrió un problema al aplicar o registrar los puntos. Podrás verlo en tu historial de pedidos.",
          });
        } else {
          dataPuntos = await resPuntos.json();
        }
      } catch (e) {
        console.error("Error de red al confirmar puntos:", e);
        huboErrorPuntos = true;
        setToast({
          type: "warning",
          title: "Pedido creado, pero hubo un detalle",
          message:
            "Tu pedido se registró correctamente, pero no se pudieron registrar los puntos por un problema de conexión.",
        });
      }

      // 3️⃣ Calcular totales mostrados (para el toast)
      const descuentoAplicado = dataPuntos
        ? Number(dataPuntos.descuento_aplicado || 0)
        : descuento;

      const totalFinal = dataPuntos
        ? Number(dataPuntos.total_final || 0)
        : total + Number(metodoSeleccionado.costo) - descuentoAplicado;

      const subtotalMostrar = Number(pedido.subtotal ?? total);

      const envioMostrar = Number(pedido.costo_envio ?? metodoSeleccionado.costo);
      
      setToast({
        type: "success",
        title: `Pedido #${pedido.id} creado correctamente 🎉`,
        message: `Subtotal: ₡${subtotalMostrar.toLocaleString(
          "es-CR"
        )} · Envío: ₡${envioMostrar.toLocaleString(
          "es-CR"
        )} · Total: ₡${totalFinal.toLocaleString("es-CR")}${huboErrorPuntos
            ? " (con observaciones en los puntos)."
            : " · ¡Gracias por tu compra!"
          }`,
      });

      // 4️⃣ Limpiar carrito y redirigir a pedidos
      clearCart();
      router.push("/account/orders");
    } catch (err) {
      console.error("Error finalizando compra", err);
      setError("Hubo un problema al procesar el pago.");
    } finally {
      setProcesandoPago(false);
    }
  }

  // ========= LOADING / CARRITO VACÍO =========
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <div className="max-w-4xl mx-auto px-4 py-8 pt-[140px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">Cargando información...</p>
          </div>
        </div>

        {/* Toast mientras carga (por si acaso) */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 max-w-sm rounded-2xl shadow-xl px-4 py-3 text-sm border ${toast.type === "success"
                ? "bg-white border-green-200"
                : "bg-white border-yellow-200"
              }`}
          >
            <p
              className={`font-semibold mb-1 ${toast.type === "success"
                  ? "text-green-700"
                  : "text-yellow-700"
                }`}
            >
              {toast.title}
            </p>
            <p className="text-gray-700">{toast.message}</p>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#fdf6e3]">
        <MainMenu />
        <div className="max-w-4xl mx-auto px-4 py-8 pt-[140px]">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-gray-600 mb-6">
              Agrega productos para continuar con el checkout
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-[#a855f7] hover:bg-[#7e22ce] text-white font-semibold rounded-xl"
            >
              Ver productos
            </button>
          </div>
        </div>

        {/* Toast en vista carrito vacío */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 max-w-sm rounded-2xl shadow-xl px-4 py-3 text-sm border ${toast.type === "success"
                ? "bg-white border-green-200"
                : "bg-white border-yellow-200"
              }`}
          >
            <p
              className={`font-semibold mb-1 ${toast.type === "success"
                  ? "text-green-700"
                  : "text-yellow-700"
                }`}
            >
              {toast.title}
            </p>
            <p className="text-gray-700">{toast.message}</p>
          </div>
        )}
      </div>
    );
  }

  // ========= UI PRINCIPAL =========
  const factorPuntoEnColones =
    limitePuntos && limitePuntos.puntos_necesarios_para_maximo > 0
      ? limitePuntos.descuento_maximo_colones /
      limitePuntos.puntos_necesarios_para_maximo
      : 0;

  const maxPuntosUsables =
    limitePuntos && limitePuntos.puede_usar_puntos
      ? Math.min(
        limitePuntos.saldo_puntos,
        limitePuntos.puntos_necesarios_para_maximo
      )
      : puntosDisponibles;

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-[140px]">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-4">
          <button
            onClick={() => router.push("/")}
            className="hover:text-[#6b21a8] hover:underline"
          >
            Inicio
          </button>
          <span className="mx-1">›</span>
          <button
            onClick={() => router.push("/cart")}
            className="hover:text-[#6b21a8] hover:underline"
          >
            Carrito
          </button>
          <span className="mx-1">›</span>
          <span className="text-gray-800 font-medium">Checkout</span>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-[#6b21a8] mb-2">
          Finalizar pedido
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Selecciona tu dirección de envío, método de entrega y aplica tus
          puntos.
        </p>

        {/* Error global */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Resumen rápido del carrito */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {items.length} producto{items.length !== 1 ? "s" : ""} en tu
                pedido
              </p>
              <p className="text-xs text-gray-500">
                Subtotal: ₡{total.toLocaleString("es-CR")}
              </p>
            </div>
            <button
              onClick={() => router.push("/cart")}
              className="text-xs text-[#a855f7] hover:text-[#7e22ce] font-medium"
            >
              Editar carrito
            </button>
          </div>
        </div>

        {/* 1. Direcciones */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              1. Dirección de envío
            </h2>
            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className="text-sm text-[#a855f7] hover:text-[#7e22ce] font-medium"
            >
              {mostrarFormulario ? "✕ Cancelar" : "+ Nueva dirección"}
            </button>
          </div>

          {/* Formulario nueva dirección */}
          {mostrarFormulario && (
            <div className="bg-[#faf5ff] rounded-xl p-4 mb-4 space-y-3">
              <p className="text-xs font-semibold text-[#6b21a8] mb-2">
                Nueva dirección
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre (ej: Casa, Trabajo)"
                  value={nuevaDireccion.nombre}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      nombre: e.target.value,
                    })
                  }
                  className="col-span-1 md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                />

                <select
                  value={nuevaDireccion.provincia}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      provincia: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                >
                  <option value="">Provincia *</option>
                  {PROVINCIAS.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Cantón *"
                  value={nuevaDireccion.canton}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      canton: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                />

                <input
                  type="text"
                  placeholder="Distrito *"
                  value={nuevaDireccion.distrito}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      distrito: e.target.value,
                    })
                  }
                  className="col-span-1 md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                />

                <textarea
                  placeholder="Dirección exacta *"
                  value={nuevaDireccion.detalle}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      detalle: e.target.value,
                    })
                  }
                  rows={2}
                  className="col-span-1 md:col-span-2 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                />

                <input
                  type="tel"
                  placeholder="Teléfono de contacto"
                  value={nuevaDireccion.telefono}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      telefono: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                />

                <input
                  type="text"
                  placeholder="Referencias adicionales"
                  value={nuevaDireccion.referencia}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      referencia: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={nuevaDireccion.predeterminada}
                  onChange={(e) =>
                    setNuevaDireccion({
                      ...nuevaDireccion,
                      predeterminada: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-[#a855f7] focus:ring-[#a855f7]"
                />
                <span className="text-gray-700">
                  Marcar como dirección predeterminada
                </span>
              </label>

              <button
                onClick={handleCrearDireccion}
                disabled={guardando}
                className="w-full bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {guardando ? "Guardando..." : "Guardar dirección"}
              </button>
            </div>
          )}

          {/* Lista de direcciones */}
          <div className="space-y-3">
            {direcciones.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">
                  No tienes direcciones guardadas
                </p>
                <p className="text-xs text-gray-400">
                  Agrega una nueva dirección para continuar
                </p>
              </div>
            ) : (
              direcciones.map((dir) => (
                <button
                  key={dir.id}
                  onClick={() => handleSeleccionarDireccion(dir)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${direccionSeleccionada?.id === dir.id
                      ? "border-[#a855f7] bg-[#faf5ff] shadow-sm"
                      : "border-gray-200 hover:border-[#a855f7]"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {dir.nombre && (
                        <p className="font-semibold text-gray-900 text-sm mb-1">
                          {dir.nombre}
                        </p>
                      )}
                      <p className="text-sm text-gray-700">{dir.detalle}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {dir.distrito}, {dir.canton}, {dir.provincia}
                      </p>
                      {dir.telefono && (
                        <p className="text-xs text-gray-500">
                          📞 {dir.telefono}
                        </p>
                      )}
                      {dir.referencia && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {dir.referencia}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {direccionSeleccionada?.id === dir.id && (
                        <span className="px-2 py-1 bg-[#a855f7] text-white text-[10px] rounded-full font-semibold">
                          SELECCIONADA
                        </span>
                      )}
                      {dir.predeterminada && (
                        <span className="px-2 py-1 bg-[#22c55e] text-white text-[10px] rounded-full font-semibold">
                          PREDETERMINADA
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 2. Método de envío */}
        {direccionSeleccionada && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              2. Método de envío
            </h2>

            {calculando ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-[#a855f7] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-500">
                  Calculando costos de envío...
                </p>
              </div>
            ) : metodosEnvio.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-500">
                  No hay métodos de envío disponibles para esta dirección
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metodosEnvio.map((metodo) => (
                  <button
                    key={metodo.metodo_envio_id}
                    onClick={() => setMetodoSeleccionado(metodo)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${metodoSeleccionado?.metodo_envio_id ===
                        metodo.metodo_envio_id
                        ? "border-[#a855f7] bg-[#faf5ff] shadow-sm"
                        : "border-gray-200 hover:border-[#a855f7]"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {metodo.metodo_nombre}
                          </p>
                          {metodoSeleccionado?.metodo_envio_id ===
                            metodo.metodo_envio_id && (
                              <span className="text-[#a855f7] text-lg">✓</span>
                            )}
                        </div>
                        {metodo.descripcion && (
                          <p className="text-xs text-gray-600 mb-2">
                            {metodo.descripcion}
                          </p>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span>🚚</span>
                            <span>
                              Entrega estimada:{" "}
                              {metodo.dias_entrega_min ===
                                metodo.dias_entrega_max
                                ? `${metodo.dias_entrega_min} ${metodo.dias_entrega_min === 1
                                  ? "día"
                                  : "días"
                                }`
                                : `${metodo.dias_entrega_min}-${metodo.dias_entrega_max} días`}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span>📅</span>
                            <span>
                              Entre{" "}
                              {new Date(
                                metodo.fecha_estimada_min
                              ).toLocaleDateString("es-CR")}{" "}
                              y{" "}
                              {new Date(
                                metodo.fecha_estimada_max
                              ).toLocaleDateString("es-CR")}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-[#6b21a8]">
                          ₡{Number(metodo.costo).toLocaleString("es-CR")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Usar puntos */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            3. Usar puntos
          </h2>

          {!direccionSeleccionada || !metodoSeleccionado ? (
            <p className="text-sm text-gray-500">
              Primero selecciona una dirección y un método de envío para ver
              cuánto puedes usar en puntos.
            </p>
          ) : !limitePuntos ? (
            <p className="text-sm text-gray-500">Calculando límite...</p>
          ) : !limitePuntos.puede_usar_puntos ? (
            <p className="text-sm text-gray-500">
              No puedes usar puntos en esta compra:{" "}
              <span className="font-semibold">{limitePuntos.motivo}</span>
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Saldo actual:{" "}
                <strong>{limitePuntos.saldo_puntos} puntos</strong>
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Máximo para esta compra:{" "}
                <strong>
                  ₡
                  {limitePuntos.descuento_maximo_colones.toLocaleString(
                    "es-CR"
                  )}
                </strong>{" "}
                ({maxPuntosUsables} puntos)
              </p>

              <div className="flex gap-2 items-center mb-3">
                <input
                  type="number"
                  min={0}
                  max={maxPuntosUsables}
                  value={puntosUsados}
                  onChange={(e) => {
                    const raw = Number(e.target.value) || 0;
                    const val = Math.max(
                      0,
                      Math.min(raw, maxPuntosUsables || 0)
                    );
                    setPuntosUsados(val);
                    setDescuento(val * factorPuntoEnColones);
                  }}
                  className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0 pts"
                />

                <button
                  onClick={() => {
                    const val = maxPuntosUsables || 0;
                    setPuntosUsados(val);
                    setDescuento(val * factorPuntoEnColones);
                  }}
                  className="px-3 py-2 bg-[#a855f7] text-white rounded-lg text-sm hover:bg-[#7e22ce]"
                >
                  Usar todos
                </button>
              </div>

              <p className="text-sm text-gray-600">
                Descuento aplicado:{" "}
                <strong>₡{descuento.toLocaleString("es-CR")}</strong>
              </p>
            </>
          )}
        </div>

        {/* 4. Resumen final */}
        {direccionSeleccionada && metodoSeleccionado && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              4. Resumen del pedido
            </h2>

            {/* Desglose de costos */}
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal sin impuesto ({items.length} producto
                  {items.length !== 1 ? "s" : ""}):
                </span>
                <span className="font-semibold">
                  ₡{Math.round(subtotalSinImpuesto).toLocaleString("es-CR")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Impuesto ({Math.round(TAX_RATE * 100)}%):
                </span>
                <span className="font-semibold">
                  ₡{Math.round(impuestoTotal).toLocaleString("es-CR")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Costo de envío:</span>
                <span className="font-semibold text-[#6b21a8]">
                  ₡{Number(metodoSeleccionado.costo).toLocaleString("es-CR")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Descuento por puntos:</span>
                <span className="font-semibold text-green-600">
                  - ₡{descuento.toLocaleString("es-CR")}
                </span>
              </div>

              <div className="border-t pt-2 mt-2 flex justify-between text-base">
                <span className="font-bold">Total final:</span>
                <span className="font-bold text-xl text-[#6b21a8]">
                  ₡
                  {(
                    total +
                    Number(metodoSeleccionado.costo) -
                    descuento
                  ).toLocaleString("es-CR")}
                </span>
              </div>
            </div>


            {/* Info envío */}
            <div className="bg-[#faf5ff] rounded-lg p-3 mb-4 text-xs">
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-gray-700 mb-1">
                    📦 Envío a:
                  </p>
                  <p className="text-gray-700">
                    {direccionSeleccionada.detalle}
                  </p>
                  <p className="text-gray-600">
                    {direccionSeleccionada.distrito},{" "}
                    {direccionSeleccionada.canton},{" "}
                    {direccionSeleccionada.provincia}
                  </p>
                  {direccionSeleccionada.telefono && (
                    <p className="text-gray-600">
                      📞 {direccionSeleccionada.telefono}
                    </p>
                  )}
                </div>
                <div className="border-t border-[#e9d5ff] pt-2">
                  <p className="font-semibold text-gray-700 mb-1">
                    🚚 Método de envío:
                  </p>
                  <p className="text-gray-700">
                    {metodoSeleccionado.metodo_nombre}
                  </p>
                  <p className="text-gray-600">
                    Entrega estimada:{" "}
                    {new Date(
                      metodoSeleccionado.fecha_estimada_min
                    ).toLocaleDateString("es-CR")}{" "}
                    -{" "}
                    {new Date(
                      metodoSeleccionado.fecha_estimada_max
                    ).toLocaleDateString("es-CR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Botón continuar */}
            <button
              onClick={handleContinuarPago}
              disabled={procesandoPago}
              className="w-full bg-[#a855f7] hover:bg-[#7e22ce] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>
                {procesandoPago
                  ? "Procesando pedido..."
                  : "Confirmar pedido (simulado)"}
              </span>
              {!procesandoPago && <span>→</span>}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Al continuar, aceptas nuestros términos y condiciones de venta
            </p>
          </div>
        )}
      </main>

      {/* Toast flotante global */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 max-w-sm rounded-2xl shadow-xl px-4 py-3 text-sm border z-50 ${toast.type === "success"
              ? "bg-white border-green-200"
              : "bg-white border-yellow-200"
            }`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5">
              {toast.type === "success" ? "✅" : "⚠️"}
            </div>
            <div>
              <p
                className={`font-semibold mb-1 ${toast.type === "success"
                    ? "text-green-700"
                    : "text-yellow-700"
                  }`}
              >
                {toast.title}
              </p>
              <p className="text-gray-700">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
