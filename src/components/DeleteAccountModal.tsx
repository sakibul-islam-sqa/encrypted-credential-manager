import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { IconCheck, IconEye, IconEyeOff, IconSpinner, IconTrash, IconX } from "./Icon";
import {
  NoSupportedProviderError,
  ReauthCancelledError,
  ReauthMismatchError,
  RequiresRecentLoginError,
  WrongPasswordError,
  useAuth,
} from "./AuthProvider";

type Step = "idle" | "reauth" | "data" | "auth" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Called once the auth user has been deleted successfully. The handler is
   * responsible for clearing in-memory app state. Local caches and remote
   * data are wiped by this modal before this callback fires.
   */
  onDeleted: () => void;
  /**
   * Best-effort cleanup of all remote and local data for the user. Must be
   * idempotent: it may run after a partial previous attempt.
   */
  wipeUserData: () => Promise<void>;
}

/**
 * Account deletion is a destructive, irreversible action that combines four
 * sub-operations (re-authenticate -> wipe remote data -> wipe local caches ->
 * delete auth user). This component orchestrates them in the safe order:
 * re-authentication FIRST so that user data is only ever deleted once the
 * caller has proven they control the account and the auth deletion is
 * guaranteed to be allowed.
 *
 * NOTE: A production system should perform the data wipe in a Cloud Function
 * triggered by `onUserDeleted` so the cleanup is server-trusted, atomic, and
 * covers resources the client cannot enumerate. This client-only orchestration
 * is the next best thing for a Firestore-only app: it minimises the half-state
 * window by re-authenticating before any destructive call.
 */
export default function DeleteAccountModal({ open, onClose, onDeleted, wipeUserData }: Props) {
  const auth = useAuth();
  const method = auth.getReauthMethod();
  const email = auth.user?.email ?? "";

  // Snapshot freshness at the moment the modal opens. We do NOT re-read it
  // continuously - if it changed mid-session the UI shouldn't flip the input
  // out from under the user.
  const sessionFresh = open ? auth.isSessionFresh() : false;
  const needsPassword = method === "password" && !sessionFresh;
  const needsPopup = method === "google" && !sessionFresh;

  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const expectedConfirmation = email || "DELETE";
  const confirmationMatches = typed.trim() === expectedConfirmation;
  const passwordReady = !needsPassword || password.length > 0;
  const busy = step !== "idle" && step !== "done";

  useEffect(() => {
    if (!open) {
      setTyped("");
      setPassword("");
      setShowPassword(false);
      setStep("idle");
      setError(null);
    }
  }, [open]);

  const statusText = useMemo(() => {
    switch (step) {
      case "reauth":
        if (needsPassword) return "Verifying password...";
        if (needsPopup) return "Waiting for Google re-authentication...";
        return "Verifying session...";
      case "data":
        return "Deleting your encrypted data...";
      case "auth":
        return "Deleting your account...";
      case "done":
        return "Account deleted.";
      default:
        return null;
    }
  }, [step, needsPassword, needsPopup]);

  async function handleConfirm() {
    if (!confirmationMatches || !passwordReady || busy) return;
    setError(null);

    try {
      setStep("reauth");
      // ensureRecentAuth skips the popup / password prompt entirely if the
      // user signed in recently. Only stale sessions trigger any UI.
      await auth.ensureRecentAuth(needsPassword ? password : undefined);

      setStep("data");
      await wipeUserData();

      setStep("auth");
      await auth.deleteAccount();

      setStep("done");
      onDeleted();
    } catch (err) {
      setStep("idle");
      setPassword("");
      setError(messageFor(err));
    }
  }

  function close() {
    if (busy) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Delete account"
      onClose={close}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={close} disabled={busy}>
            <IconX size={16} />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => void handleConfirm()}
            disabled={!confirmationMatches || !passwordReady || busy}
          >
            {busy ? <IconSpinner size={14} /> : <IconTrash size={16} />}
            <span>{busy ? (statusText ?? "Deleting account...") : "Delete account"}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <p>
          This permanently deletes your encrypted vault, all notes, and your account. You will not
          be able to sign in again with this account. <strong>This cannot be undone.</strong>
        </p>

        {method === null && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
            Your account uses a sign-in method that cannot be re-authenticated from this screen.
            Please contact support.
          </p>
        )}

        {needsPassword && (
          <div>
            <label htmlFor="reauth-password" className="label">
              Confirm with your password
            </label>
            <div className="relative">
              <input
                id="reauth-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                placeholder="Your account password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-200"
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>
        )}

        {needsPopup && (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
            For security, Google will briefly open a window to confirm it is
            really you. This cannot be skipped.
          </p>
        )}

        <div>
          <label htmlFor="reauth-typed" className="label">
            Type{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">
              {expectedConfirmation}
            </code>{" "}
            to confirm
          </label>
          <input
            id="reauth-typed"
            type="text"
            data-autofocus
            autoComplete="off"
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
            placeholder={expectedConfirmation}
          />
        </div>

        {statusText && (
          <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
            {step === "done" ? <IconCheck size={14} /> : <IconSpinner size={14} />}
            <span>{statusText}</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ReauthCancelledError) {
    return "Re-authentication was cancelled. No data was deleted.";
  }
  if (err instanceof ReauthMismatchError) {
    return "You re-authenticated with a different account. Please use the same account you are signed in as.";
  }
  if (err instanceof WrongPasswordError) {
    return "Incorrect password. No data was deleted.";
  }
  if (err instanceof RequiresRecentLoginError) {
    return err.message;
  }
  if (err instanceof NoSupportedProviderError) {
    return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}
