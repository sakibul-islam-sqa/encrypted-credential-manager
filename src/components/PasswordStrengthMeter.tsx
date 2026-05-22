import { useMemo } from "react";
import { estimateStrength, type StrengthScore } from "../lib/passwordStrength";

interface Props {
  password: string;
  showSuggestions?: boolean;
}

const SEGMENT_COLORS: Record<StrengthScore, string> = {
  0: "bg-rose-500",
  1: "bg-orange-500",
  2: "bg-amber-500",
  3: "bg-lime-500",
  4: "bg-emerald-500",
};

const LABEL_COLORS: Record<StrengthScore, string> = {
  0: "text-rose-600 dark:text-rose-300",
  1: "text-orange-600 dark:text-orange-300",
  2: "text-amber-600 dark:text-amber-300",
  3: "text-lime-600 dark:text-lime-300",
  4: "text-emerald-600 dark:text-emerald-300",
};

export default function PasswordStrengthMeter({ password, showSuggestions = true }: Props) {
  const result = useMemo(() => estimateStrength(password), [password]);

  if (!password) return null;

  const filledSegments = result.score + 1;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div
          className="flex h-1.5 flex-1 gap-1"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={result.score}
          aria-label={`Password strength: ${result.label}`}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-full transition-colors ${
                i < filledSegments ? SEGMENT_COLORS[result.score] : "bg-slate-200 dark:bg-slate-800"
              }`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-medium tabular-nums ${LABEL_COLORS[result.score]}`}>
          {result.label}
        </span>
      </div>
      {showSuggestions && (result.warning || result.suggestions.length > 0) && (
        <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {result.warning && <li className="text-rose-600 dark:text-rose-300">{result.warning}</li>}
          {result.suggestions.slice(0, 3).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <p className="sr-only">{`Estimated entropy: ${result.entropyBits} bits.`}</p>
    </div>
  );
}
