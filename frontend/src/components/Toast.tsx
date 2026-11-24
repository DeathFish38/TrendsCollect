import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "default" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };
type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);

function ToastMessage({
  toast,
  dismiss,
}: {
  toast: ToastItem;
  dismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), 4_000);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <div className={`toast${toast.tone === "error" ? " toast--error" : ""}`}>
      <span>{toast.message}</span>
      <button
        className="toast__close"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

/** Lightweight, dependency-free notifications styled as newspaper margin notes. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>((message, tone = "default") => {
    nextId.current += 1;
    const toast = { id: nextId.current, message, tone };
    setToasts((current) => [...current.slice(-2), toast]);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
