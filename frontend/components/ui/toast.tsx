// components/ui/toast.tsx
"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  type: ToastType;
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const toastIcons = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

const toastStyles = {
  success: "bg-white border-green-200 text-green-700",
  error: "bg-white border-red-200 text-red-700",
  warning: "bg-white border-yellow-200 text-yellow-700",
  info: "bg-white border-blue-200 text-blue-700",
};

const toastTitleColors = {
  success: "text-green-700",
  error: "text-red-700",
  warning: "text-yellow-700",
  info: "text-blue-700",
};

export function Toast({
  type,
  title,
  message,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 max-w-sm rounded-2xl shadow-xl px-4 py-3 text-sm border z-50 animate-slide-up ${toastStyles[type]}`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-lg">{toastIcons[type]}</div>
        <div className="flex-1">
          <p className={`font-semibold mb-1 ${toastTitleColors[type]}`}>
            {title}
          </p>
          <p className="text-gray-700">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          aria-label="Cerrar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Hook personalizado para usar Toast de forma más sencilla
export function useToastState() {
  const [toast, setToast] = useState<{
    type: ToastType;
    title: string;
    message: string;
  } | null>(null);

  const showToast = (
    type: ToastType,
    title: string,
    message: string
  ) => {
    setToast({ type, title, message });
  };

  const hideToast = () => {
    setToast(null);
  };

  return { toast, showToast, hideToast };
}