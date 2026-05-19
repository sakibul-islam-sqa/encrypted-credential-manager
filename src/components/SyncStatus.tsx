import { useEffect, useState } from "react";
import { IconCloud } from "./Icon";

export type SyncState = "idle" | "syncing" | "synced" | "error" | "offline";

interface Props {
  state: SyncState;
  lastSyncedAt?: number;
}

function formatRelative(ts?: number): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function SyncStatus({ state, lastSyncedAt }: Props) {
  const [, force] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const dotColor =
    state === "syncing"
      ? "bg-amber-400 animate-pulse"
      : state === "error" || state === "offline"
        ? "bg-rose-500"
        : "bg-emerald-500";

  const label =
    state === "syncing"
      ? "Syncing..."
      : state === "error"
        ? "Sync failed"
        : state === "offline"
          ? "Offline"
          : `Synced ${formatRelative(lastSyncedAt)}`;

  return (
    <span className="chip" title={label} aria-live="polite">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="hidden sm:inline">{label}</span>
      <IconCloud size={12} className="sm:hidden" />
    </span>
  );
}
