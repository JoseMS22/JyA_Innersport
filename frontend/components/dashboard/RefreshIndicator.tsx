// frontend/components/dashboard/RefreshIndicator.tsx
"use client";

import { useEffect, useState } from "react";

type RefreshIndicatorProps = {
  lastUpdate: Date;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
};

export function RefreshIndicator({
  lastUpdate,
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
}: RefreshIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);

      if (seconds < 10) {
        setTimeAgo("Justo ahora");
      } else if (seconds < 60) {
        setTimeAgo(`Hace ${seconds}s`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`Hace ${minutes}m`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <div
          className={`w-2 h-2 rounded-full ${
            autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-300"
          }`}
        ></div>
        <span className="text-xs">{timeAgo}</span>
      </div>

      <button
        onClick={onToggleAutoRefresh}
        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
          autoRefresh
            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {autoRefresh ? "Auto ✓" : "Manual"}
      </button>

      <button
        onClick={onManualRefresh}
        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        title="Actualizar ahora"
      >
        <svg
          className="w-4 h-4 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}