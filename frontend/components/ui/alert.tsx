// components/ui/alert.tsx
"use client";

export interface AlertProps {
  title: string;
  message: string;
  type?: "info" | "warning" | "error" | "success";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  showCancel?: boolean;
}

const alertIcons = {
  info: "ℹ️",
  warning: "⚠️",
  error: "❌",
  success: "✅",
};

const alertColors = {
  info: "text-blue-600",
  warning: "text-yellow-600",
  error: "text-red-600",
  success: "text-green-600",
};

export function Alert({
  title,
  message,
  type = "info",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  showCancel = false,
}: AlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full mx-4 px-6 py-5 text-sm animate-scale-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">{alertIcons[type]}</div>
          <div className="flex-1">
            <h2 className={`font-semibold text-gray-900 mb-1 ${alertColors[type]}`}>
              {title}
            </h2>
            <p className="text-gray-700">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onCancel}
            className="px-4 py-1.5 rounded-lg bg-[#a855f7] text-white text-xs font-semibold hover:bg-[#7e22ce] transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}