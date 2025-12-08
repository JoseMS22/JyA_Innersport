// frontend/app/admin/comisiones/_components/ComisionesTable.tsx
"use client";

type Comision = {
  id: number;
  vendedor_nombre: string;
  monto_venta: number;
  monto_comision: number;
  porcentaje_aplicado: number;
  tipo_venta: string;
  estado: string;
  fecha_venta: string;
  sucursal_nombre: string | null;
};

type ComisionesTableProps = {
  comisiones: Comision[];
  loading: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onRefresh: () => void;
};

export function ComisionesTable({
  comisiones,
  loading,
  selectedIds,
  onSelectionChange,
  onRefresh,
}: ComisionesTableProps) {
  const currency = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendientes = comisiones
        .filter((c) => c.estado === "PENDIENTE")
        .map((c) => c.id);
      onSelectionChange(pendientes);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((cid) => cid !== id));
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "LIQUIDADA":
        return "bg-green-100 text-green-700 border-green-200";
      case "CANCELADA":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 mt-3">Cargando comisiones...</p>
      </div>
    );
  }

  if (comisiones.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-500">No se encontraron comisiones</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length > 0 &&
                    comisiones.filter((c) => c.estado === "PENDIENTE").length ===
                      selectedIds.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Vendedor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                Monto Venta
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                %
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                Comisión
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Sucursal
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {comisiones.map((comision) => (
              <tr key={comision.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {comision.estado === "PENDIENTE" && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(comision.id)}
                      onChange={(e) => handleSelectOne(comision.id, e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {comision.vendedor_nombre}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600">
                    {new Date(comision.fecha_venta).toLocaleDateString("es-CR")}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      comision.tipo_venta === "POS"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {comision.tipo_venta}
                  </span>
                </td>

                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {currency.format(comision.monto_venta)}
                </td>

                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {comision.porcentaje_aplicado}%
                </td>

                <td className="px-4 py-3 text-right text-sm font-semibold text-purple-600">
                  {currency.format(comision.monto_comision)}
                </td>

                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full border ${getEstadoBadge(
                      comision.estado
                    )}`}
                  >
                    {comision.estado}
                  </span>
                </td>

                <td className="px-4 py-3 text-sm text-gray-600">
                  {comision.sucursal_nombre || "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}