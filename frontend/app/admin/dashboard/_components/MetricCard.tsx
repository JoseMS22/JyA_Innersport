// frontend/app/admin/dashboard/_components/MetricCard.tsx
type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon?: string;
};

export function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>

      <div className="text-2xl font-bold text-[#6b21a8] mb-1">{value}</div>

      <div className="flex items-center gap-2">
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        
        {trend !== undefined && trend !== null && (
          <div
            className={`text-xs font-medium flex items-center gap-1 ${
              trend >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend >= 0 ? "↑" : "↓"}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}