import type { ReactNode } from "react";

interface Props {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

/**
 * Pill-style segmented tab used in the app header to switch between
 * Credentials / URLs / Notes.
 */
export default function TabButton({ active, onClick, icon, label }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition ${
        active
          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
