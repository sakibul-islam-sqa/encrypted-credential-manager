import { useEffect, useRef } from "react";
import { IconX } from "./Icon";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  titleId?: string;
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
  titleId,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const autoTitleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`);
  const labelId = titleId ?? autoTitleId.current;

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog so screen readers/keyboards are oriented
    // here instead of on the now-inert background. Prefer (1) an element with
    // an explicit `autoFocus`/`data-autofocus`, then (2) the first focusable
    // inside the body content (skipping the header close button), then (3)
    // the dialog itself.
    const focusTimer = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const explicit = root.querySelector<HTMLElement>(
        "[data-autofocus], [autofocus]"
      );
      if (explicit) {
        explicit.focus();
        return;
      }
      const body = root.querySelector<HTMLElement>("[data-modal-body]") ?? root;
      const focusable = body.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? root).focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      const target = restoreFocusRef.current;
      if (target && typeof target.focus === "function" && document.contains(target)) {
        target.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm dark:bg-slate-950/70"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        className={`relative w-full ${widths[size]} card shadow-glow-lg outline-none`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800/70">
          <h2 id={labelId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            className="btn-ghost !px-2 !py-1.5"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={16} />
          </button>
        </div>
        <div data-modal-body className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800/70">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
