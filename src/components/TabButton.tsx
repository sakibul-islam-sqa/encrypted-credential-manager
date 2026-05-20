import type { ReactNode } from "react";

interface Props {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}

export default function TabButton({ active, onClick, icon, label, badge }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
        active
          ? "bg-white text-brand-700 shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.06] dark:bg-slate-700 dark:text-brand-200 dark:ring-slate-100/[0.06]"
          : "text-slate-500 hover:bg-white/50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
      }`}
      aria-pressed={active}
    >
      <span className={`transition-colors ${active ? "text-brand-500 dark:text-brand-300" : ""}`}>
        {icon}
      </span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`ml-0.5 min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none transition-colors ${
            active
              ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
              : "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
