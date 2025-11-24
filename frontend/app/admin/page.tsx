// frontend/app/admin/page.tsx
export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-[#6b21a8]">
          Panel de administración
        </h1>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Desde aquí vas a gestionar el catálogo de productos, variantes,
          sucursales e inventario de JyA Innersport. Más adelante
          conectaremos estos módulos con los endpoints del backend.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Productos & Variantes
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Crear y actualizar productos, categorías y variantes (tallas,
            colores, etc.).
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Inventario por sucursal
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Control de stock por sucursal y movimientos de inventario.
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 border border-[#e5e7eb] p-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Historial de precios
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Registro de cambios de precio para trazabilidad y análisis.
          </p>
        </div>
      </section>
    </div>
  );
}
