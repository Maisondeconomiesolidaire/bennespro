import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, TriangleAlert, X } from "lucide-react";
import { cn } from "../../lib/cn";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };

type ToastApi = {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = ++counter.current;
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "animate-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-[var(--shadow-strong)]",
                toast.tone === "success" && "border-brand-200 bg-brand-50 text-brand-800",
                toast.tone === "error" && "border-red-200 bg-red-50 text-red-800",
                toast.tone === "info" && "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
              )}
              role="status"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white",
                  toast.tone === "error" ? "bg-red-500" : "bg-brand-500",
                )}
              >
                {toast.tone === "error" ? (
                  <TriangleAlert className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" strokeWidth={3} />
                )}
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>.");
  return ctx;
}
