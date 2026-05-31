import { IconSearch, IconX } from "./Icon";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name — search inputs have no visible <label>. */
  label: string;
  name: string;
  placeholder?: string;
  /** "sm" matches the compact Notes sidebar search; "md" (default) is the standard size. */
  size?: "sm" | "md";
  /** Extra classes for the wrapper (e.g. "flex-1"). */
  className?: string;
}

// Each size keeps its class strings whole so Tailwind's scanner can see them.
const SIZES = {
  sm: {
    searchIcon: 14,
    searchPos: "left-2.5",
    input: "input !py-2 pl-8 pr-8 text-xs",
    clearPos: "right-1.5",
    clearIcon: 12,
  },
  md: {
    searchIcon: 16,
    searchPos: "left-3",
    input: "input pl-9 pr-9",
    clearPos: "right-2",
    clearIcon: 14,
  },
} as const;

/**
 * Text search box with a leading search icon and a custom clear (✕) button that
 * appears once there's a query. Uses type="search" for semantics; the native
 * clear button is suppressed in index.css in favor of this consistent one.
 */
export default function SearchInput({
  value,
  onChange,
  label,
  name,
  placeholder,
  size = "md",
  className,
}: Props) {
  const s = SIZES[size];
  return (
    <div className={`relative ${className ?? ""}`}>
      <IconSearch
        size={s.searchIcon}
        className={`pointer-events-none absolute ${s.searchPos} top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500`}
      />
      <input
        type="search"
        name={name}
        aria-label={label}
        className={s.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className={`absolute ${s.clearPos} top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800/70 dark:hover:text-slate-200`}
          onClick={() => onChange("")}
          aria-label="Clear search"
          title="Clear"
        >
          <IconX size={s.clearIcon} />
        </button>
      )}
    </div>
  );
}
