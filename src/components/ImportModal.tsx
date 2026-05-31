import { useState } from "react";
import Modal from "./Modal";
import { IconEye, IconEyeOff, IconSpinner } from "./Icon";
import { SECRET_INPUT_PROPS } from "../lib/secretInput";

interface Props {
  open: boolean;
  text: string;
  password: string;
  passwordVisible: boolean;
  error: string | null;
  onChangeText: (v: string) => void;
  onChangePassword: (v: string) => void;
  onTogglePasswordVisible: () => void;
  onClose: () => void;
  onImport: () => void | Promise<void>;
}

/**
 * Encrypted-backup import modal. The decryption itself happens in the
 * parent (so that we can plug into the toast/persist pipeline), this
 * component is purely the form UI.
 */
export default function ImportModal({
  open,
  text,
  password,
  passwordVisible,
  error,
  onChangeText,
  onChangePassword,
  onTogglePasswordVisible,
  onClose,
  onImport,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await onImport();
    } finally {
      setBusy(false);
    }
  }

  function guardedClose() {
    if (busy) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Import encrypted vault"
      onClose={guardedClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={guardedClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            form="import-form"
            className="btn-primary"
            disabled={busy || !password}
          >
            {busy ? <IconSpinner size={14} /> : null}
            <span>{busy ? "Importing..." : "Import & merge"}</span>
          </button>
        </>
      }
    >
      <form
        id="import-form"
        className="space-y-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="text-slate-600 dark:text-slate-300">
          Enter the master password the file was exported with. Decryption happens in this browser -
          the password never leaves it.
        </p>
        <div>
          <label className="label" htmlFor="imp-pw">
            Master password used for this file
          </label>
          <div className="relative">
            <input
              id="imp-pw"
              name="vault-import-key"
              {...SECRET_INPUT_PROPS}
              className={`input pr-10${passwordVisible ? "" : " masked-input"}`}
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="Master password used at export time"
              disabled={busy}
              autoFocus
            />
            <button
              type="button"
              className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 !px-2 !py-1 text-slate-500"
              onClick={onTogglePasswordVisible}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              title={passwordVisible ? "Hide password" : "Show password"}
              tabIndex={-1}
              disabled={busy}
            >
              {passwordVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          </div>
        </div>
        <details>
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            Show raw JSON
          </summary>
          <textarea
            name="import-json"
            aria-label="Raw JSON to import"
            className="input mt-2 min-h-[160px] font-mono text-[12px]"
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
            disabled={busy}
          />
        </details>
        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
