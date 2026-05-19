import Modal from "./Modal";
import { IconEye, IconEyeOff } from "./Icon";

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
  return (
    <Modal
      open={open}
      title="Import encrypted vault"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => void onImport()}>
            Import &amp; merge
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
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
              type={passwordVisible ? "text" : "password"}
              className="input pr-10"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="Master password used at export time"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 !px-2 !py-1 text-slate-500"
              onClick={onTogglePasswordVisible}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              title={passwordVisible ? "Hide password" : "Show password"}
              tabIndex={-1}
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
            className="input mt-2 min-h-[160px] font-mono text-[12px]"
            value={text}
            onChange={(e) => onChangeText(e.target.value)}
          />
        </details>
        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
