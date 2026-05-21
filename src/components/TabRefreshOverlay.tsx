import type { ReactNode } from "react";

interface Props {
  loading: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Full-tab overlay shown while tab data is pulled from Firebase.
 */
export default function TabRefreshOverlay({ loading, title, subtitle, children }: Props) {
  return (
    <div className="relative min-h-[min(60vh,640px)]">
      {children}
      {loading ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-[6px] dark:bg-slate-950/55 pointer-events-auto"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={title}
        >
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200/90 bg-white/95 px-10 py-8 shadow-xl shadow-brand-500/10 ring-1 ring-slate-900/[0.04] dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-white/[0.06]">
            <div className="relative h-14 w-14" aria-hidden>
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-brand-500/15 border-t-brand-500" />
              <div
                className="absolute inset-2 animate-spin rounded-full border-[3px] border-cyan-400/15 border-t-cyan-400"
                style={{ animationDirection: "reverse", animationDuration: "0.9s" }}
              />
              <div className="absolute inset-[18px] rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 opacity-90 shadow-md shadow-brand-500/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {title}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
              <div className="tab-refresh-shimmer h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
