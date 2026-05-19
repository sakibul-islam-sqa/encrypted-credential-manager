import { IconSpinner } from "./Icon";

interface Props {
  label: string;
  /**
   * When true, fills its parent's height instead of the full viewport.
   * Useful for Suspense fallbacks inside an already-mounted layout.
   */
  inline?: boolean;
}

export default function CenteredSpinner({ label, inline }: Props) {
  return (
    <div
      className={`flex items-center justify-center px-4 ${
        inline ? "min-h-[40vh]" : "min-h-screen"
      }`}
    >
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <IconSpinner size={18} className="text-brand-500 dark:text-brand-300" />
        {label}
      </div>
    </div>
  );
}
