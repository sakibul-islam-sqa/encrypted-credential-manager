import Modal from "./Modal";
import { IconSpinner } from "./Icon";

export interface ConfirmState {
  open: boolean;
  title?: string;
  message?: string;
  destructive?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

interface Props {
  state: ConfirmState;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Re-usable confirm dialog driven by a single `ConfirmState` object. The
 * caller orchestrates the actual action via `onConfirm` and exposes
 * `pending` while the action is in flight.
 */
export default function ConfirmModal({ state, pending, onCancel, onConfirm }: Props) {
  return (
    <Modal
      open={state.open}
      title={state.title ?? "Confirm"}
      onClose={() => {
        if (pending) return;
        onCancel();
      }}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className={state.destructive ? "btn-danger" : "btn-primary"}
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending && <IconSpinner size={14} />}
            {pending ? "Working..." : (state.confirmLabel ?? "Confirm")}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">{state.message}</p>
    </Modal>
  );
}
