import { useCallback, useRef, useState } from "react";
import type { AppView } from "../lib/views";
import type { SyncActions } from "./useSyncStatus";

interface UseTabRefreshArgs {
  /** Whether a refresh can run (i.e. the vault is unlocked). */
  enabled: boolean;
  sync: SyncActions;
  refreshVault: () => Promise<void>;
  refreshNotes: () => Promise<void>;
}

export interface TabRefresh {
  tabRefreshing: boolean;
  tabRefreshTarget: AppView;
  refreshFromRemote: (target: AppView) => Promise<void>;
}

/**
 * Orchestrates the "fetching latest…" overlay shown when switching tabs. Pulls
 * the relevant collection from remote, coalescing concurrent requests: while
 * one refresh is in flight a later target is queued and run once it finishes.
 */
export function useTabRefresh({
  enabled,
  sync,
  refreshVault,
  refreshNotes,
}: UseTabRefreshArgs): TabRefresh {
  const [tabRefreshing, setTabRefreshing] = useState(false);
  const [tabRefreshTarget, setTabRefreshTarget] = useState<AppView>("credentials");
  const inFlightRef = useRef(false);
  const pendingTargetRef = useRef<AppView | null>(null);

  const refreshFromRemote = useCallback(
    async (target: AppView) => {
      if (!enabled) return;
      if (inFlightRef.current) {
        pendingTargetRef.current = target;
        setTabRefreshTarget(target);
        return;
      }
      inFlightRef.current = true;
      setTabRefreshTarget(target);
      setTabRefreshing(true);
      sync.beginSyncing();
      let ok = false;
      try {
        if (target === "notes") {
          await refreshNotes();
        } else {
          await refreshVault();
        }
        ok = true;
      } catch {
        sync.markError();
      } finally {
        inFlightRef.current = false;
        if (ok) sync.markSynced();
        const pending = pendingTargetRef.current;
        pendingTargetRef.current = null;
        if (pending) {
          void refreshFromRemote(pending);
        } else {
          setTabRefreshing(false);
        }
      }
    },
    [enabled, sync, refreshVault, refreshNotes]
  );

  return { tabRefreshing, tabRefreshTarget, refreshFromRemote };
}
