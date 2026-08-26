"use client";

import * as React from "react";
import { CheckCircle2, CircleAlert, Clock3, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "destructive";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  dismissLabel?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = React.createContext<{
  toast: (input: ToastInput) => void;
} | null>(null);

const toastStyles: Record<ToastVariant, string> = {
  default: "border-slate-200 bg-white text-slate-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  destructive: "border-red-200 bg-red-50 text-red-950",
};

const toastIcons = {
  default: Info,
  success: CheckCircle2,
  warning: Clock3,
  destructive: CircleAlert,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(0);
  const dismiss = React.useCallback(
    (id: number) =>
      setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { ...input, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[200] flex flex-col items-end gap-2 sm:start-auto sm:w-[390px]"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => {
          const variant = item.variant ?? "default";
          const Icon = toastIcons[variant];
          return (
            <div
              className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg",
                toastStyles[variant],
              )}
              role={variant === "destructive" ? "alert" : "status"}
              key={item.id}
            >
              <Icon className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <strong className="block text-sm">{item.title}</strong>
                {item.description && (
                  <p className="mt-1 text-sm opacity-80">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                className="grid size-7 shrink-0 place-items-center rounded-md bg-transparent opacity-70 hover:bg-black/5 hover:opacity-100"
                aria-label={item.dismissLabel ?? "Close"}
                onClick={() => dismiss(item.id)}
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
