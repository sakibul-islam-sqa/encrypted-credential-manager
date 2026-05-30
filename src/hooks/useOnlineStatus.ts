import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SyncState } from "../components/SyncStatus";

/**
 * Reflect the browser's connectivity in the sync indicator: drop to "offline"
 * when the network disappears and clear it back to "idle" when it returns
 * (without clobbering an in-progress sync state).
 */
export function useOnlineStatus(setSyncState: Dispatch<SetStateAction<SyncState>>): void {
  useEffect(() => {
    function onOnline() {
      setSyncState((s) => (s === "offline" ? "idle" : s));
    }
    function onOffline() {
      setSyncState("offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSyncState("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setSyncState]);
}
