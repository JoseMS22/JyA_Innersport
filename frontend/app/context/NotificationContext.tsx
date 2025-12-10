// frontend/app/context/NotificationContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Toast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";

// ========================================
// TIPOS
// ========================================

type ToastType = "success" | "error" | "warning" | "info";

type ToastData = {
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
};

type AlertData = {
  title: string;
  message: string;
  type?: "info" | "warning" | "error" | "success";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
};

type NotificationContextType = {
  // Toast
  showToast: (
    type: ToastType,
    title: string,
    message: string,
    duration?: number
  ) => void;
  hideToast: () => void;

  // Alert
  showAlert: (data: AlertData) => void;
  hideAlert: () => void;

  // Atajos convenientes
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
  info: (title: string, message: string) => void;

  // Confirmación rápida
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string
  ) => void;
};

// ========================================
// CONTEXT
// ========================================

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// ========================================
// PROVIDER
// ========================================

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [alert, setAlert] = useState<AlertData | null>(null);

  // Función principal de Toast
  const showToast = (
    type: ToastType,
    title: string,
    message: string,
    duration = 3500
  ) => {
    setToast({ type, title, message, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Función principal de Alert
  const showAlert = (data: AlertData) => {
    setAlert(data);
  };

  const hideAlert = () => {
    setAlert(null);
  };

  // Atajos convenientes para Toast
  const success = (title: string, message: string) => {
    showToast("success", title, message);
  };

  const error = (title: string, message: string) => {
    showToast("error", title, message);
  };

  const warning = (title: string, message: string) => {
    showToast("warning", title, message);
  };

  const info = (title: string, message: string) => {
    showToast("info", title, message);
  };

  // Atajo para confirmación rápida
  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = "Confirmar"
  ) => {
    showAlert({
      title,
      message,
      type: "warning",
      showCancel: true,
      confirmText,
      cancelText: "Cancelar",
      onConfirm,
    });
  };

  const value: NotificationContextType = {
    showToast,
    hideToast,
    showAlert,
    hideAlert,
    success,
    error,
    warning,
    info,
    confirm,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast Global */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={hideToast}
          duration={toast.duration}
        />
      )}

      {/* Alert Global */}
      {alert && (
        <Alert
          title={alert.title}
          message={alert.message}
          type={alert.type || "info"}
          confirmText={alert.confirmText}
          cancelText={alert.cancelText}
          showCancel={alert.showCancel}
          onConfirm={() => {
            alert.onConfirm?.();
            hideAlert();
          }}
          onCancel={hideAlert}
        />
      )}
    </NotificationContext.Provider>
  );
}

// ========================================
// HOOK
// ========================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error(
      "useNotifications debe usarse dentro de NotificationProvider"
    );
  }
  
  return context;
}