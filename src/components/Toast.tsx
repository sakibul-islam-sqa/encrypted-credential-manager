import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconAlertCircle, IconCheckCircle, IconInfoCircle, IconSpinner, IconX } from "./Icon";

type FinalKind = "success" | "error" | "info";
type ToastKind = FinalKind | "loading";

interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
  bornAt: number;
}

export interface ToastApi {
  show: (message: string, kind?: FinalKind) => number;
  loading: (message: string) => number;
  update: (id: number, message: string, kind: FinalKind) => void;
  dismiss: (id: number) => void;
  promise: <T>(
    p: Promise<T>,
    messages: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => Promise<T>;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast outside provider");
  return v;
}

const DURATION: Record<FinalKind, number> = {
  success: 2800,
  info: 2800,
  error: 4500,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const handle = timersRef.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const schedule = useCallback(
    (id: number, ms: number) => {
      const existing = timersRef.current.get(id);
      if (existing !== undefined) window.clearTimeout(existing);
      const handle = window.setTimeout(() => dismiss(id), ms);
      timersRef.current.set(id, handle);
    },
    [dismiss]
  );

  const show = useCallback(
    (message: string, kind: FinalKind = "info"): number => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, kind, message, bornAt: Date.now() }]);
      schedule(id, DURATION[kind]);
      return id;
    },
    [schedule]
  );

  const loading = useCallback((message: string): number => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind: "loading", message, bornAt: Date.now() }]);
    return id;
  }, []);

  const update = useCallback(
    (id: number, message: string, kind: FinalKind) => {
      setToasts((t) =>
        t.map((x) => (x.id === id ? { ...x, message, kind, bornAt: Date.now() } : x))
      );
      schedule(id, DURATION[kind]);
    },
    [schedule]
  );

  const promise = useCallback(
    async <T,>(
      p: Promise<T>,
      messages: {
        loading: string;
        success: string | ((value: T) => string);
        error: string | ((err: unknown) => string);
      }
    ): Promise<T> => {
      const id = loading(messages.loading);
      try {
        const v = await p;
        const msg = typeof messages.success === "function" ? messages.success(v) : messages.success;
        update(id, msg, "success");
        return v;
      } catch (e) {
        const msg = typeof messages.error === "function" ? messages.error(e) : messages.error;
        update(id, msg, "error");
        throw e;
      }
    },
    [loading, update]
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((h) => window.clearTimeout(h));
      timersRef.current.clear();
    },
    []
  );

  const value = useMemo<ToastApi>(
    () => ({ show, loading, update, dismiss, promise }),
    [show, loading, update, dismiss, promise]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col items-stretch gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} entry={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const tone = TONE[entry.kind];
  return (
    <div
      className={`toast-enter pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white/95 px-3 py-2.5 shadow-glow-lg backdrop-blur-md dark:bg-slate-900/95 ${tone.container}`}
      role={entry.kind === "error" ? "alert" : "status"}
    >
      <span className={`mt-0.5 shrink-0 ${tone.icon}`}>{tone.glyph}</span>
      <p className="min-w-0 flex-1 text-sm leading-snug text-slate-800 dark:text-slate-100">
        {entry.message}
      </p>
      {entry.kind !== "loading" && (
        <button
          type="button"
          className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <IconX size={12} />
        </button>
      )}
    </div>
  );
}

const TONE: Record<ToastKind, { container: string; icon: string; glyph: React.ReactNode }> = {
  success: {
    container: "border-emerald-200 dark:border-emerald-800/60",
    icon: "text-emerald-600 dark:text-emerald-300",
    glyph: <IconCheckCircle size={18} />,
  },
  error: {
    container: "border-rose-200 dark:border-rose-800/60",
    icon: "text-rose-600 dark:text-rose-300",
    glyph: <IconAlertCircle size={18} />,
  },
  info: {
    container: "border-slate-200 dark:border-slate-700/70",
    icon: "text-slate-500 dark:text-slate-300",
    glyph: <IconInfoCircle size={18} />,
  },
  loading: {
    container: "border-slate-200 dark:border-slate-700/70",
    icon: "text-brand-600 dark:text-brand-300",
    glyph: <IconSpinner size={18} />,
  },
};
