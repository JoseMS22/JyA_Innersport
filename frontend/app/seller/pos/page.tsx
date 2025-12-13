// frontend/app/seller/pos/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SellerMenu } from "@/components/SellerMenu";
import { useNotifications } from "../../context/NotificationContext";

// ========= Tipos auxiliares =========

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function buildMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}

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

type SucursalPOS = {
  id: number;
  nombre: string;
  activo: boolean;
  provincia?: string | null;
};

type POSConfig = {
  usuario_id: number;
  nombre_usuario: string;
  rol: string;
  sucursales: SucursalPOS[];
  caja_actual: CajaTurno | null;
};

type UserMeForMenu = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type MetodoPago = "EFECTIVO" | "TARJETA" | "SINPE" | "OTRO";

type POSProducto = {
  variante_id: number;
  producto_id: number;
  nombre: string;
  precio: string;
  sku: string;
  sucursal_id: number;
  stock: number;
  imagen_url?: string | null;
  color?: string | null;
  talla?: string | null;
};

type POSClienteSearchItem = {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string | null;
  puntos_actuales: number;
};

type POSClientePublic = {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string | null;
};

type CartItem = {
  id: string;
  variante_id: number;
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
};

const IVA_RATE = 0.13;
const FACTOR_IVA = 1 + IVA_RATE;

function precioBaseDesdeConIVA(precioConIVA: number) {
  return Math.round((precioConIVA / FACTOR_IVA) * 100) / 100;
}

function precioConIVADesdeBase(base: number) {
  return Math.round(base * FACTOR_IVA * 100) / 100;
}

const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

export default function SellerPOSPage() {
  const router = useRouter();
  const { success, error: showError, warning, info } = useNotifications();

  const [config, setConfig] = useState<POSConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [userMenu, setUserMenu] = useState<UserMeForMenu | null>(null);

  const [sucursalSeleccionada, setSucursalSeleccionada] =
    useState<number | null>(null);

  // Caja
  const [caja, setCaja] = useState<CajaTurno | null>(null);
  const [montoApertura, setMontoApertura] = useState("");
  const [montoCierreReal, setMontoCierreReal] = useState("");
  const [cajaLoading, setCajaLoading] = useState(false);
  const [showCerrarCajaModal, setShowCerrarCajaModal] = useState(false);

  // Productos POS
  const [productos, setProductos] = useState<POSProducto[]>([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [productosError, setProductosError] = useState<string | null>(null);

  // Carrito
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [productFilter, setProductFilter] = useState("");

  // Modal de pago
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoMetodo, setPagoMetodo] = useState<MetodoPago>("EFECTIVO");
  const [pagoNombreCliente, setPagoNombreCliente] = useState("");
  const [pagoPuntos, setPagoPuntos] = useState("");
  const [pagoLoading, setPagoLoading] = useState(false);

  // Cliente
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResultados, setClienteResultados] = useState<
    POSClienteSearchItem[]
  >([]);
  const [clienteLoading, setClienteLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<POSClienteSearchItem | null>(null);

  const [showCreateCliente, setShowCreateCliente] = useState(false);
  const [clienteNuevoNombre, setClienteNuevoNombre] = useState("");
  const [clienteNuevoCorreo, setClienteNuevoCorreo] = useState("");
  const [clienteNuevoTelefono, setClienteNuevoTelefono] = useState("");
  const [clienteNuevoPassword, setClienteNuevoPassword] = useState("");
  const [clienteNuevoPassword2, setClienteNuevoPassword2] = useState("");
  const [clienteCreateLoading, setClienteCreateLoading] = useState(false);

  const tieneCajaAbierta = caja?.estado === "ABIERTA";

  const [productoPreview, setProductoPreview] = useState<POSProducto | null>(
    null
  );

  const subtotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [cartItems]
  );

  const impuesto = useMemo(
    () => Math.round(subtotal * IVA_RATE * 100) / 100,
    [subtotal]
  );

  const totalConImpuesto = useMemo(
    () => Math.round((subtotal + impuesto) * 100) / 100,
    [subtotal, impuesto]
  );

  const totalItems = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.cantidad, 0),
    [cartItems]
  );

  // Cargar config POS
  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        setLoadingConfig(true);
        setConfigError(null);

        const data = (await apiFetch("/api/v1/pos/config")) as POSConfig;

        if (!isMounted) return;

        setConfig(data);
        setCaja(data.caja_actual ?? null);
        setUserMenu({
          id: data.usuario_id,
          nombre: data.nombre_usuario,
          correo: "",
          rol: data.rol,
        });

        if (data.sucursales && data.sucursales.length > 0) {
          setSucursalSeleccionada(data.sucursales[0].id);
        } else {
          setSucursalSeleccionada(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.status === 401) {
          router.push("/login");
          return;
        }
        setConfigError(
          err?.message ?? "No se pudo cargar la configuración del POS."
        );
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
    } finally {
      router.push("/login");
    }
  }

  // Cargar productos del POS según sucursal + filtro
  useEffect(() => {
    if (!sucursalSeleccionada) {
      setProductos([]);
      return;
    }

    let cancelado = false;

    async function loadProductos() {
      try {
        setProductosLoading(true);
        setProductosError(null);

        const params = new URLSearchParams({
          sucursal_id: String(sucursalSeleccionada),
        });

        if (productFilter.trim()) {
          params.set("search", productFilter.trim());
        }

        const data = (await apiFetch(
          `/api/v1/pos/productos?${params.toString()}`
        )) as POSProducto[];

        if (cancelado) return;
        setProductos(data);
      } catch (err: any) {
        if (cancelado) return;
        setProductosError(
          err?.message ?? "No se pudieron cargar los productos del POS."
        );
      } finally {
        if (!cancelado) setProductosLoading(false);
      }
    }

    loadProductos();
    return () => {
      cancelado = true;
    };
  }, [sucursalSeleccionada, productFilter]);

  // Carrito
  function handleAddToCart(product: POSProducto) {
    const precioConIVA = Number(product.precio);
    const precioBase = precioBaseDesdeConIVA(precioConIVA);

    setCartItems((prev) => {
      const id = String(product.variante_id);
      const existing = prev.find((i) => i.id === id);

      if (product.stock <= 0) {
        showError("Sin stock", "No hay stock disponible de esta variante.");
        return prev;
      }

      if (existing) {
        if (existing.cantidad >= product.stock) {
          warning(
            "Stock máximo alcanzado",
            "No puedes agregar más unidades, ya alcanzaste el stock disponible."
          );
          return prev;
        }

        return prev.map((i) =>
          i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }

      return [
        ...prev,
        {
          id,
          variante_id: product.variante_id,
          producto_id: product.producto_id,
          nombre: product.nombre,
          precio: precioBase,
          cantidad: 1,
          stock: product.stock,
        },
      ];
    });
  }

  function handleChangeQuantity(id: string, delta: number) {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;

          let nuevaCantidad = item.cantidad + delta;

          if (nuevaCantidad <= 0) {
            return { ...item, cantidad: 0 };
          }

          if (nuevaCantidad > item.stock) {
            warning(
              "Stock insuficiente",
              "No hay más stock disponible de esta variante."
            );
            return item;
          }

          return { ...item, cantidad: nuevaCantidad };
        })
        .filter((item) => item.cantidad > 0)
    );
  }

  function handleRemoveItem(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleClearCart() {
    if (cartItems.length === 0) return;
    if (!confirm("¿Vaciar carrito?")) return;
    setCartItems([]);
    info("Carrito vaciado", "Se eliminaron todos los productos del carrito.");
  }

  // Caja - Abrir
  async function handleAbrirCaja() {
    if (!montoApertura) {
      showError("Campo requerido", "Debes indicar el monto de apertura.");
      return;
    }

    const montoNumber = Number(montoApertura.replace(",", "."));
    if (Number.isNaN(montoNumber) || montoNumber < 0) {
      showError("Monto inválido", "El monto de apertura no es válido.");
      return;
    }

    try {
      setCajaLoading(true);

      const body = { monto_apertura: montoNumber };

      const nuevaCaja = (await apiFetch("/api/v1/pos/caja/abrir", {
        method: "POST",
        body: JSON.stringify(body),
      })) as CajaTurno;

      setCaja(nuevaCaja);
      setMontoApertura("");
      success(
        "Caja abierta",
        `Caja abierta con ${currency.format(montoNumber)} de apertura.`
      );
    } catch (err: any) {
      showError(
        "Error al abrir caja",
        err?.message ?? "No se pudo abrir la caja. Inténtalo de nuevo."
      );
    } finally {
      setCajaLoading(false);
    }
  }

  function openCerrarCajaModal() {
    setMontoCierreReal("");
    setShowCerrarCajaModal(true);
  }

  // Caja - Cerrar
  async function handleCerrarCaja(e: React.FormEvent) {
    e.preventDefault();
    if (!tieneCajaAbierta) return;

    const montoNumber = Number(montoCierreReal.replace(",", "."));
    if (Number.isNaN(montoNumber) || montoNumber < 0) {
      showError("Monto inválido", "El monto de cierre no es válido.");
      return;
    }

    try {
      setCajaLoading(true);

      const body = {
        monto_real_cierre: montoNumber,
        observaciones: "",
      };

      const cajaCerrada = (await apiFetch("/api/v1/pos/caja/cerrar", {
        method: "POST",
        body: JSON.stringify(body),
      })) as CajaTurno;

      setCaja(cajaCerrada);
      setShowCerrarCajaModal(false);
      
      const diferencia = cajaCerrada.diferencia 
        ? Number(cajaCerrada.diferencia) 
        : 0;
      
      if (diferencia === 0) {
        success("Caja cerrada", "La caja se cerró correctamente sin diferencias.");
      } else if (diferencia > 0) {
        warning(
          "Caja cerrada con sobrante",
          `Se cerró la caja con un sobrante de ${currency.format(Math.abs(diferencia))}.`
        );
      } else {
        warning(
          "Caja cerrada con faltante",
          `Se cerró la caja con un faltante de ${currency.format(Math.abs(diferencia))}.`
        );
      }
    } catch (err: any) {
      showError(
        "Error al cerrar caja",
        err?.message ?? "No se pudo cerrar la caja. Inténtalo de nuevo."
      );
    } finally {
      setCajaLoading(false);
    }
  }

  // Cliente - Buscar
  async function handleBuscarCliente() {
    setClienteResultados([]);

    const termino = clienteSearch.trim();
    if (!termino) {
      showError("Campo vacío", "Escribe al menos parte del correo para buscar.");
      return;
    }

    try {
      setClienteLoading(true);
      const data = (await apiFetch(
        `/api/v1/pos/clientes/buscar?correo=${encodeURIComponent(termino)}`
      )) as POSClienteSearchItem[];
      setClienteResultados(data);
      if (data.length === 0) {
        info("Sin resultados", "No se encontraron clientes con ese correo.");
      }
    } catch (err: any) {
      showError(
        "Error en búsqueda",
        err?.message ?? "No se pudo buscar clientes. Inténtalo de nuevo."
      );
    } finally {
      setClienteLoading(false);
    }
  }

  function handleSeleccionarCliente(c: POSClienteSearchItem) {
    setClienteSeleccionado(c);
    setPagoNombreCliente(c.nombre);
    setPagoPuntos("");
    setClienteResultados([]);
    success("Cliente seleccionado", `${c.nombre} - ${c.puntos_actuales} puntos disponibles`);
  }

  function handleLimpiarCliente() {
    setClienteSeleccionado(null);
    setPagoNombreCliente("");
    setPagoPuntos("");
    setClienteResultados([]);
  }

  // Cliente - Crear
  async function handleCrearClientePOS() {
    if (!clienteNuevoNombre.trim() || !clienteNuevoCorreo.trim()) {
      showError("Campos incompletos", "Nombre y correo son obligatorios.");
      return;
    }
    if (!clienteNuevoPassword || !clienteNuevoPassword2) {
      showError("Contraseña requerida", "Debes indicar y confirmar la contraseña.");
      return;
    }

    try {
      setClienteCreateLoading(true);

      const body = {
        nombre: clienteNuevoNombre.trim(),
        correo: clienteNuevoCorreo.trim(),
        telefono: clienteNuevoTelefono.trim() || null,
        password: clienteNuevoPassword,
        confirm_password: clienteNuevoPassword2,
      };

      const nuevo = (await apiFetch("/api/v1/pos/clientes", {
        method: "POST",
        body: JSON.stringify(body),
      })) as POSClientePublic;

      setClienteSeleccionado({
        id: nuevo.id,
        nombre: nuevo.nombre,
        correo: nuevo.correo,
        telefono: nuevo.telefono ?? undefined,
        puntos_actuales: 0,
      });
      setPagoNombreCliente(nuevo.nombre);
      setPagoPuntos("");

      setClienteNuevoNombre("");
      setClienteNuevoCorreo("");
      setClienteNuevoTelefono("");
      setClienteNuevoPassword("");
      setClienteNuevoPassword2("");
      setShowCreateCliente(false);

      success("Cliente creado", `${nuevo.nombre} fue creado correctamente.`);
    } catch (err: any) {
      showError(
        "Error al crear cliente",
        err?.message ?? "No se pudo crear el cliente. Revisa los datos."
      );
    } finally {
      setClienteCreateLoading(false);
    }
  }

  // Cobro REAL
  async function handleConfirmarPago(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!sucursalSeleccionada) {
      showError("Sucursal no seleccionada", "Debes seleccionar una sucursal para registrar la venta.");
      return;
    }

    setPagoLoading(true);

    try {
      const total = totalConImpuesto;

      if (total <= 0) {
        showError("Total inválido", "El total debe ser mayor a cero.");
        setPagoLoading(false);
        return;
      }

      if (pagoMetodo === "EFECTIVO" && !tieneCajaAbierta) {
        showError("Caja cerrada", "Debes tener una caja ABIERTA para cobrar en efectivo.");
        setPagoLoading(false);
        return;
      }

      const puntosNumber = pagoPuntos ? parseInt(pagoPuntos, 10) : 0;
      if (Number.isNaN(puntosNumber) || puntosNumber < 0) {
        showError("Puntos inválidos", "Los puntos a usar deben ser un número válido.");
        setPagoLoading(false);
        return;
      }

      const esVentaConCliente = !!clienteSeleccionado;

      if (puntosNumber > 0 && !esVentaConCliente) {
        showError(
          "Cliente requerido para puntos",
          "Para usar puntos debes seleccionar un cliente. La venta de mostrador no admite puntos."
        );
        setPagoLoading(false);
        return;
      }

      const body = {
        sucursal_id: sucursalSeleccionada,
        cliente_id: esVentaConCliente ? clienteSeleccionado!.id : null,
        usar_cliente_mostrador: !esVentaConCliente,
        nombre_cliente:
          pagoNombreCliente ||
          (esVentaConCliente ? clienteSeleccionado!.nombre : "Anónimo"),
        puntos_a_usar: esVentaConCliente ? puntosNumber : 0,
        items: cartItems.map((item) => ({
          producto_id: item.producto_id,
          variante_id: item.variante_id,
          cantidad: item.cantidad,
          precio_unitario: Number(item.precio.toFixed(2)),
        })),
        pagos: [
          {
            metodo: pagoMetodo,
            monto: total,
          },
        ],
      };

      const venta = await apiFetch("/api/v1/pos/ventas", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setCartItems([]);
      setPagoNombreCliente("");
      setPagoPuntos("");
      setPagoMetodo("EFECTIVO");
      setPagoModalOpen(false);
      setClienteSeleccionado(null);
      setClienteResultados([]);
      setClienteSearch("");

      success(
        "Venta registrada",
        `Venta por ${currency.format(total)} registrada correctamente.`
      );

      if (venta && (venta as any).id) {
        router.push(`/seller/ventas/${(venta as any).id}`);
      }
    } catch (err: any) {
      showError(
        "Error al procesar cobro",
        err?.message ??
        "Ocurrió un error al procesar el cobro. Verifica la caja, stock y datos de la venta."
      );
    } finally {
      setPagoLoading(false);
    }
  }

  // PARTE 2/2 - UI COMPLETA (Continúa desde la Parte 1)
// Copia todo el código de la Parte 1 y agrega esto después de handleConfirmarPago:

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
        <p className="text-sm text-gray-600">Cargando POS del vendedor...</p>
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow border border-red-200 p-6">
          <h1 className="text-lg font-semibold text-red-700 mb-2">
            No se pudo cargar el POS
          </h1>
          <p className="text-sm text-gray-700 mb-4">
            {configError ?? "Ocurrió un problema al cargar la configuración."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm px-4 py-2 rounded-lg bg-gray-800 !text-white"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const noTieneSucursales =
    !config.sucursales || config.sucursales.length === 0;

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex flex-col">
      {userMenu && <SellerMenu user={userMenu} onLogout={handleLogout} />}

      {/* Contenido principal POS */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 flex flex-col lg:flex-row gap-4">
        {/* Columna izquierda: búsqueda + productos */}
        <section className="flex-1 flex flex-col gap-3">
          {/* Barra de búsqueda + sucursal */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] px-4 py-3 shadow-sm flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-64">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Sucursal
                </label>
                <select
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                  value={sucursalSeleccionada ?? ""}
                  onChange={(e) =>
                    setSucursalSeleccionada(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={noTieneSucursales}
                >
                  {noTieneSucursales && (
                    <option value="">Sin sucursales asignadas</option>
                  )}
                  {config.sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Búsqueda */}
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Buscar productos
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm pr-8 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                    placeholder="Buscar por nombre o SKU..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    disabled={!sucursalSeleccionada}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Los productos se cargan según la sucursal seleccionada y el stock
              disponible en inventario.
            </p>
          </div>

          {/* Listado de productos */}
          <div className="flex-1 bg-white rounded-2xl border border-[#e5e7eb] p-3 shadow-sm overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Productos
              </h2>
              <span className="text-[11px] text-gray-500">
                {productos.length} resultado
                {productos.length === 1 ? "" : "s"}
              </span>
            </div>

            {!sucursalSeleccionada ? (
              <div className="text-center py-10 text-xs text-gray-500">
                Selecciona una sucursal para ver los productos disponibles.
              </div>
            ) : productosLoading ? (
              <div className="text-center py-10 text-xs text-gray-500">
                Cargando productos...
              </div>
            ) : productosError ? (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {productosError}
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-500">
                No se encontraron productos con ese filtro en esta sucursal.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {productos.map((p) => {
                  const imagen = buildMediaUrl(p.imagen_url);

                  const precioConIVA = Number(p.precio);
                  const precioBase = precioBaseDesdeConIVA(precioConIVA);
                  const precioReconstruido = precioConIVADesdeBase(precioBase);

                  return (
                    <div
                      key={p.variante_id}
                      className="group text-left rounded-xl border border-[#e5e7eb] bg-white hover:border-[#a855f7]/50 hover:shadow-sm transition-all p-3 flex flex-col justify-between"
                    >
                      <div>
                        {imagen && (
                          <div className="mb-2 rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                            <img
                              src={imagen}
                              alt={p.nombre}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                          {p.nombre}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          SKU: {p.sku}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Stock: {p.stock} unidades
                        </p>

                        <p className="mt-1 text-[11px] text-gray-800 font-semibold">
                          {currency.format(precioReconstruido)} IVA incluido
                        </p>

                        {(p.color || p.talla) && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            {p.color && <>Color: {p.color}{"  "}</>}
                            {p.talla && <>Talla: {p.talla}</>}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="text-[11px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                          onClick={() => setProductoPreview(p)}
                        >
                          Mostrar
                        </button>
                        <button
                          type="button"
                          className="text-[11px] px-2 py-1 rounded bg-[#a855f7] text-white hover:bg-[#7e22ce]"
                          onClick={() => handleAddToCart(p)}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Columna derecha: caja + carrito */}
        <aside className="w-full lg:w-[320px] xl:w-[360px] flex flex-col gap-3">
          {/* Panel de caja */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-3 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
              Caja del vendedor
            </h2>

            {tieneCajaAbierta ? (
              <div className="text-[11px] text-gray-600 space-y-1">
                <p>
                  <span className="font-semibold">Apertura:</span>{" "}
                  {currency.format(Number(caja?.monto_apertura ?? 0))}
                </p>
                {caja?.monto_teorico_cierre && (
                  <p>
                    <span className="font-semibold">Teórico:</span>{" "}
                    {currency.format(
                      Number(caja.monto_teorico_cierre ?? 0)
                    )}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500">
                  Al cerrar caja se calculará el monto teórico según las ventas
                  en efectivo y otros movimientos de caja.
                </p>

                <button
                  type="button"
                  onClick={openCerrarCajaModal}
                  className="mt-2 w-full rounded-lg border border-[#e5e7eb] text-[11px] text-gray-700 py-1.5 hover:bg-gray-50"
                  disabled={cajaLoading}
                >
                  Cerrar caja
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-gray-700">
                  Monto de apertura
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-xs outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                  placeholder="Ej: 50000"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  disabled={cajaLoading}
                />
                <button
                  type="button"
                  onClick={handleAbrirCaja}
                  disabled={cajaLoading}
                  className="w-full rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-semibold py-1.5 disabled:opacity-50"
                >
                  {cajaLoading ? "Abriendo..." : "Abrir caja"}
                </button>
              </div>
            )}
          </div>

          {/* Carrito */}
          <div className="flex-1 bg-white rounded-2xl border border-[#e5e7eb] p-3 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Carrito
              </h2>
              <button
                type="button"
                onClick={handleClearCart}
                disabled={cartItems.length === 0}
                className="text-[11px] text-gray-500 hover:text-red-600 disabled:opacity-40"
              >
                Vaciar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {cartItems.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  Aún no hay productos en el carrito. Selecciona productos en la
                  columna izquierda.
                </p>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2 last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {item.nombre}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {currency.format(item.precio)} c/u
                      </p>
                      <p className="mt-1 text-[11px] text-gray-600">
                        Subtotal:{" "}
                        <span className="font-semibold text-[#6b21a8]">
                          {currency.format(item.precio * item.cantidad)}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleChangeQuantity(item.id, -1)
                          }
                          className="w-6 h-6 rounded-full border border-[#e5e7eb] flex items-center justify-center text-xs hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleChangeQuantity(item.id, +1)
                          }
                          className="w-6 h-6 rounded-full border border-[#e5e7eb] flex items-center justify-center text-xs hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[10px] text-gray-400 hover:text-red-500"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Artículos</span>
                <span>{totalItems}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{currency.format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA (13%)</span>
                <span>{currency.format(impuesto)}</span>
              </div>

              <div className="flex justify-between font-semibold text-gray-800">
                <span>Total</span>
                <span className="text-[#6b21a8]">
                  {currency.format(totalConImpuesto)}
                </span>
              </div>

              {!tieneCajaAbierta && (
                <p className="mt-1 text-[11px] text-red-600">
                  Debes abrir una caja para poder cobrar ventas con efectivo.
                </p>
              )}

              <button
                type="button"
                disabled={cartItems.length === 0 || !sucursalSeleccionada}
                className="w-full mt-2 rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-semibold py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (cartItems.length === 0) return;
                  if (!sucursalSeleccionada) return;
                  setPagoModalOpen(true);
                }}
              >
                Cobrar y finalizar venta
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Modal preview producto */}
      {productoPreview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setProductoPreview(null)}
          />
          <div className="relative z-50 bg-white rounded-2xl p-4 max-w-md w-full shadow-xl">
            <h3 className="text-sm font-semibold mb-2">
              {productoPreview.nombre}
            </h3>
            {buildMediaUrl(productoPreview.imagen_url) && (
              <img
                src={buildMediaUrl(productoPreview.imagen_url)!}
                alt={productoPreview.nombre}
                className="w-full rounded-lg mb-3"
              />
            )}
            <p className="text-xs text-gray-600 mb-1">
              SKU: {productoPreview.sku}
            </p>
            {productoPreview.color && (
              <p className="text-xs text-gray-600 mb-1">
                Color: {productoPreview.color}
              </p>
            )}
            {productoPreview.talla && (
              <p className="text-xs text-gray-600 mb-1">
                Talla: {productoPreview.talla}
              </p>
            )}
            <p className="text-sm font-semibold text-[#6b21a8] mt-2">
              {currency.format(Number(productoPreview.precio))}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200"
                onClick={() => setProductoPreview(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-lg bg-[#a855f7] text-white"
                onClick={() => {
                  handleAddToCart(productoPreview);
                  setProductoPreview(null);
                }}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COBRO */}
      {pagoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !pagoLoading && setPagoModalOpen(false)}
          />
          <div className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#e5e7eb] p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">
              Cobrar venta
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Revisa el total, elige el método de pago y, si quieres, asigna un
              nombre para el cliente en el ticket. Puedes hacer ventas de
              mostrador o vincular un cliente para usar puntos.
            </p>

            <form className="space-y-4" onSubmit={handleConfirmarPago}>
              <div className="rounded-lg bg-[#f9f5ff] border border-[#e9d5ff] px-3 py-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total a cobrar</span>
                  <span className="font-semibold text-[#6b21a8]">
                    {currency.format(totalConImpuesto)}
                  </span>
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Método de pago
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {(["EFECTIVO", "TARJETA", "SINPE", "OTRO"] as MetodoPago[]).map(
                    (metodo) => {
                      const active = pagoMetodo === metodo;
                      return (
                        <button
                          key={metodo}
                          type="button"
                          onClick={() => setPagoMetodo(metodo)}
                          disabled={pagoLoading}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${active
                            ? "border-[#a855f7] bg-[#f9f5ff] text-[#6b21a8]"
                            : "border-[#e5e7eb] text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          {metodo}
                        </button>
                      );
                    }
                  )}
                </div>
                {pagoMetodo === "EFECTIVO" && !tieneCajaAbierta && (
                  <p className="mt-1 text-[10px] text-red-600">
                    Recuerda: para cobrar en efectivo debes tener una caja
                    ABIERTA.
                  </p>
                )}
              </div>

              {/* Cliente: búsqueda y selección */}
              <div className="border border-[#e5e7eb] rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">
                  Cliente (opcional)
                </p>

                {clienteSeleccionado ? (
                  <div className="flex items-start justify-between gap-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-2 py-2">
                    <div className="text-[11px]">
                      <p className="font-semibold text-gray-800">
                        {clienteSeleccionado.nombre}
                      </p>
                      <p className="text-gray-600">
                        {clienteSeleccionado.correo}
                      </p>
                      {clienteSeleccionado.telefono && (
                        <p className="text-gray-500">
                          Tel: {clienteSeleccionado.telefono}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-emerald-700">
                        Puntos actuales:{" "}
                        <span className="font-semibold">
                          {clienteSeleccionado.puntos_actuales}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-gray-500 hover:text-red-600"
                      onClick={handleLimpiarCliente}
                      disabled={pagoLoading}
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 items-center">
                      <input
                        type="email"
                        placeholder="Buscar por correo..."
                        className="flex-1 rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-xs outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                        value={clienteSearch}
                        onChange={(e) =>
                          setClienteSearch(e.target.value)
                        }
                        disabled={clienteLoading || pagoLoading}
                      />
                      <button
                        type="button"
                        onClick={handleBuscarCliente}
                        disabled={clienteLoading || pagoLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium 
             bg-[#f5f3ff] text-[#6b21a8] border border-[#e9d5ff]
             hover:bg-[#ede9fe]
             disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {clienteLoading ? "Buscando..." : "Buscar"}
                      </button>
                    </div>

                    {clienteResultados.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-auto border border-[#e5e7eb] rounded-lg">
                        {clienteResultados.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-[#f9fafb] border-b border-[#f1f5f9] last:border-b-0"
                            onClick={() => handleSeleccionarCliente(c)}
                            disabled={pagoLoading}
                          >
                            <p className="font-semibold text-gray-800">
                              {c.nombre}
                            </p>
                            <p className="text-gray-600">{c.correo}</p>
                            <p className="text-[10px] text-gray-500">
                              Puntos: {c.puntos_actuales}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Toggle para crear cliente rápido */}
                <button
                  type="button"
                  className="mt-1 text-[11px] text-[#6b21a8] underline"
                  onClick={() =>
                    setShowCreateCliente((prev) => !prev)
                  }
                  disabled={pagoLoading}
                >
                  {showCreateCliente
                    ? "Ocultar creación rápida"
                    : "Crear nuevo cliente desde POS"}
                </button>

                {showCreateCliente && (
                  <div className="mt-2 space-y-2 border-t border-[#e5e7eb] pt-2">
                    <div className="grid grid-cols-1 gap-2 text-[11px]">
                      <div>
                        <label className="block mb-1">
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-xs"
                          value={clienteNuevoNombre}
                          onChange={(e) =>
                            setClienteNuevoNombre(e.target.value)
                          }
                          disabled={clienteCreateLoading || pagoLoading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Correo</label>
                        <input
                          type="email"
                          className="w-full rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-xs"
                          value={clienteNuevoCorreo}
                          onChange={(e) =>
                            setClienteNuevoCorreo(e.target.value)
                          }
                          disabled={clienteCreateLoading || pagoLoading}
                        />
                      </div>
                      <div>
                        <label className="block mb-1">
                          Teléfono (opcional)
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-xs"
                          value={clienteNuevoTelefono}
                          onChange={(e) =>
                            setClienteNuevoTelefono(e.target.value)
                          }
                          disabled={clienteCreateLoading || pagoLoading}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block mb-1">
                            Contraseña
                          </label>
                          <input
                            type="password"
                            className="w-full rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-xs"
                            value={clienteNuevoPassword2}
                            onChange={(e) =>
                              setClienteNuevoPassword2(e.target.value)
                            }
                            disabled={clienteCreateLoading || pagoLoading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCrearClientePOS}
                        disabled={clienteCreateLoading || pagoLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium
             bg-[#f5f3ff] text-[#6b21a8] border border-[#e9d5ff]
             hover:bg-[#ede9fe]
             disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {clienteCreateLoading
                          ? "Creando..."
                          : "Crear cliente"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nombre que va en el ticket */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre del cliente en el ticket
                </label>
                <input
                  type="text"
                  placeholder='Ej: "María Rodríguez" o deja vacío para "Anónimo"'
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                  value={pagoNombreCliente}
                  onChange={(e) => setPagoNombreCliente(e.target.value)}
                  disabled={pagoLoading}
                />
              </div>

              {/* Puntos */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Puntos a usar (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                  placeholder="Ej: 150"
                  value={pagoPuntos}
                  onChange={(e) => setPagoPuntos(e.target.value)}
                  disabled={pagoLoading || !clienteSeleccionado}
                />
                {!clienteSeleccionado && (
                  <p className="mt-1 text-[10px] text-gray-500">
                    Para usar puntos primero selecciona o crea un cliente.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPagoModalOpen(false)}
                  disabled={pagoLoading}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[#e5e7eb] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pagoLoading || cartItems.length === 0}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[#a855f7] hover:bg-[#7e22ce] !text-white font-semibold disabled:opacity-50"
                >
                  {pagoLoading ? "Procesando..." : "Confirmar cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CERRAR CAJA */}
      {showCerrarCajaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => !cajaLoading && setShowCerrarCajaModal(false)}
          />
          <div className="relative z-10 max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#e5e7eb] p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">
              Cerrar caja
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Indica el monto real contado en caja para calcular la diferencia.
            </p>
            <form className="space-y-3" onSubmit={handleCerrarCaja}>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Monto real en caja
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={montoCierreReal}
                  onChange={(e) => setMontoCierreReal(e.target.value)}
                  className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]/40"
                  placeholder="Ej: 75000"
                  disabled={cajaLoading}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCerrarCajaModal(false)}
                  disabled={cajaLoading}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[#e5e7eb] text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cajaLoading}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[#a855f7] hover:bg-[#7e22ce] text-white font-semibold disabled:opacity-50"
                >
                  {cajaLoading ? "Cerrando..." : "Confirmar cierre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}