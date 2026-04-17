"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, { bg: string; color: string }> = {
  success: { bg: "#002022", color: "#79F5FF" },
  error:   { bg: "#93000A", color: "#FFDAD6" },
  info:    { bg: "#0E1D25", color: "#D2E2EC" },
  warning: { bg: "#221B00", color: "#FFD700" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => toast("success", msg), [toast]);
  const error = useCallback((msg: string) => toast("error", msg), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-right"
            style={{
              background: toastStyles[t.type].bg,
              color: toastStyles[t.type].color,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-sm font-bold flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
