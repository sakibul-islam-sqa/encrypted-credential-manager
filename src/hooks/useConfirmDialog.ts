import { useCallback, useState } from "react";
import type { ConfirmState } from "../components/ConfirmModal";

export interface ConfirmRequest {
  title: string;
  message: string;
  destructive?: boolean;
  confirmLabel?: string;
  /**
   * The work to run when the user confirms. The dialog closes automatically on
   * success and stays open on rejection so the user can retry — so `action`
   * should surface its own error (e.g. via a toast) and then re-throw.
   */
  action: () => void | Promise<void>;
}

export interface ConfirmController {
  state: ConfirmState;
  pending: boolean;
  ask: (req: ConfirmRequest) => void;
  close: () => void;
}

/**
 * Drives a single shared confirm dialog. Centralises the "set pending → run →
 * close on success / keep open on error" lifecycle that every destructive
 * action used to repeat by hand.
 */
export function useConfirmDialog(): ConfirmController {
  const [state, setState] = useState<ConfirmState>({ open: false });
  const [pending, setPending] = useState(false);

  const close = useCallback(() => setState({ open: false }), []);

  const ask = useCallback((req: ConfirmRequest) => {
    setState({
      open: true,
      title: req.title,
      message: req.message,
      destructive: req.destructive,
      confirmLabel: req.confirmLabel,
      onConfirm: async () => {
        setPending(true);
        try {
          await req.action();
          setState({ open: false });
        } catch {
          // keep the dialog open for retry; the action surfaced its own error
        } finally {
          setPending(false);
        }
      },
    });
  }, []);

  return { state, pending, ask, close };
}
