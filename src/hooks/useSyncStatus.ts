import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SyncState } from "../components/SyncStatus";

/**
 * Stable set of transitions for the app-wide sync indicator. Kept separate from
 * the live `syncState`/`lastSyncedAt` values so the functions can be passed to
 * other hooks as dependencies without churning their identity on every change.
 */
export interface SyncActions {
  setSyncState: Dispatch<SetStateAction<SyncState>>;
  /** Unconditionally enter the "syncing" state (used by writes). */
  markSyncing: () => void;
  /** Enter "syncing" unless we're offline, in which case stay offline (used by reads). */
  beginSyncing: () => void;
  /** Mark a successful round-trip: stamp the time and show "synced". */
  markSynced: () => void;
  /** Mark a failure: "error" when online, "offline" otherwise. */
  markError: () => void;
}

export interface SyncStatus {
  syncState: SyncState;
  lastSyncedAt: number | undefined;
  actions: SyncActions;
}

export function useSyncStatus(): SyncStatus {
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>(undefined);

  const markSyncing = useCallback(() => setSyncState("syncing"), []);
  const beginSyncing = useCallback(
    () => setSyncState((s) => (s === "offline" ? "offline" : "syncing")),
    []
  );
  const markSynced = useCallback(() => {
    setLastSyncedAt(Date.now());
    setSyncState("synced");
  }, []);
  const markError = useCallback(() => setSyncState(navigator.onLine ? "error" : "offline"), []);

  const actions = useMemo<SyncActions>(
    () => ({ setSyncState, markSyncing, beginSyncing, markSynced, markError }),
    [markSyncing, beginSyncing, markSynced, markError]
  );

  return { syncState, lastSyncedAt, actions };
}
