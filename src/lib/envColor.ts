/**
 * Map an environment name to a consistent Tailwind chip color set.
 *
 * The same environment name (case-insensitive) always renders with the same
 * palette in every view (credentials, URLs, modals). Production is loud red,
 * pre-prod is orange, UAT amber, staging yellow, QA emerald, dev sky, local
 * neutral, sandbox violet, demo fuchsia, anything else neutral slate.
 */
export function envColor(env: string): string {
  const e = env.toLowerCase().trim();
  if (e.includes("prod") && !e.includes("pre")) {
    return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/40 dark:text-rose-200";
  }
  if (e.includes("pre")) {
    return "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-700/40 dark:bg-orange-900/40 dark:text-orange-200";
  }
  if (e === "uat") {
    return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/40 dark:text-amber-200";
  }
  if (e.startsWith("stag")) {
    return "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-700/40 dark:bg-yellow-900/40 dark:text-yellow-200";
  }
  if (e === "qa") {
    return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  if (e === "dev") {
    return "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/40 dark:text-sky-200";
  }
  if (e === "sandbox") {
    return "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/40 dark:text-violet-200";
  }
  if (e === "demo") {
    return "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-700/40 dark:bg-fuchsia-900/40 dark:text-fuchsia-200";
  }
  // local, other, custom names
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200";
}
