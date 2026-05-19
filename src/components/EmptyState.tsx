import type { ReactNode } from "react";

interface Props {
  /** Big rounded badge in the gradient circle, typically an Icon. */
  icon: ReactNode;
  /** Short headline, e.g. "Your vault is empty". */
  title: string;
  /** One-or-two-line explanation. */
  description: string;
  /** Optional CTA rendered below the description. */
  action?: ReactNode;
  /** Extra Tailwind classes for the outer card. */
  className?: string;
}

/**
 * Centered "nothing here yet" card used by every list view in the app
 * (credentials, URLs, notes). Single source of truth for the empty-state look
 * so that all three remain visually consistent.
 */
export default function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={`card flex flex-col items-center justify-center gap-3 p-12 text-center ${
        className ?? ""
      }`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-cyan-400/20 text-brand-700 dark:text-brand-200">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
