import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getFirebase, translateAuthError } from "../lib/firebase";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import ThemeToggle from "./ThemeToggle";
import {
  IconAlertCircle,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  IconKey,
  IconShield,
  IconSpinner,
} from "./Icon";

/**
 * Branded handler for Firebase Auth email-action links (reset password, verify
 * email, recover email). Replaces Google's default `/__/auth/action` page so
 * the experience matches the rest of the app. See `lib/authActionRoute.ts` for
 * how Firebase Console is pointed here, and App.tsx for how this route renders.
 *
 * It talks to Firebase directly via getFirebase() rather than going through
 * AuthProvider: an action code is validated on its own and must not kick off
 * the vault-bootstrap flow that a real session would.
 */

type Mode = "resetPassword" | "verifyEmail" | "verifyAndChangeEmail" | "recoverEmail";

type Status =
  | { kind: "loading" }
  | { kind: "reset"; email: string | null }
  | { kind: "success"; title: string; message: string }
  | { kind: "error"; title: string; message: string };

const MIN_PASSWORD_LENGTH = 6;

function readParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    mode: (q.get("mode") as Mode | null) ?? null,
    oobCode: q.get("oobCode"),
    continueUrl: q.get("continueUrl"),
  };
}

function describeActionError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/expired-action-code":
      return "This link has expired. Request a new email and try again.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used. Request a new one and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support if you think this is a mistake.";
    case "auth/user-not-found":
      return "We couldn't find an account for this link.";
    case "auth/weak-password":
      return `Password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    default:
      return translateAuthError(err);
  }
}

export default function AuthActionPage() {
  const { mode, oobCode, continueUrl } = useMemo(() => readParams(), []);

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const validated = useRef(false);

  // Only ever navigate back to a same-origin target so a crafted `continueUrl`
  // can't turn this page into an open redirect. Falls back to the app root.
  const continueTarget = useMemo(() => {
    if (!continueUrl) return "/";
    try {
      const u = new URL(continueUrl, window.location.origin);
      if (u.origin === window.location.origin) return u.pathname + u.search + u.hash;
    } catch {
      // fall through to root
    }
    return "/";
  }, [continueUrl]);

  const goToApp = useCallback(() => window.location.assign(continueTarget), [continueTarget]);

  // Validate the action code once on mount. Reset codes only get verified here
  // (the actual change happens on submit); the other modes are applied outright.
  //
  // A ref guard - not the usual cancelled-on-cleanup flag - keeps this to a
  // single run: action codes are single-use, so StrictMode's dev double-invoke
  // would otherwise spend the code on the first mount and fail the second,
  // showing a bogus "invalid link" error for a perfectly valid click.
  useEffect(() => {
    if (validated.current) return;
    validated.current = true;

    (async () => {
      if (!mode || !oobCode) {
        setStatus({
          kind: "error",
          title: "Invalid link",
          message: "This link is missing required information. Request a new email and try again.",
        });
        return;
      }

      const fb = await getFirebase();
      if (!fb) {
        setStatus({
          kind: "error",
          title: "Unavailable",
          message: "Account actions aren't available right now. Please try again later.",
        });
        return;
      }

      const authMod = await import("firebase/auth");
      try {
        if (mode === "resetPassword") {
          const email = await authMod.verifyPasswordResetCode(fb.auth, oobCode);
          setStatus({ kind: "reset", email });
        } else if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
          await authMod.applyActionCode(fb.auth, oobCode);
          setStatus({
            kind: "success",
            title: "Email verified",
            message: "Your email address has been verified. You can now sign in.",
          });
        } else if (mode === "recoverEmail") {
          const info = await authMod.checkActionCode(fb.auth, oobCode);
          const restored = info.data.email ?? null;
          await authMod.applyActionCode(fb.auth, oobCode);
          setStatus({
            kind: "success",
            title: "Email change reverted",
            message: restored
              ? `Your account email has been restored to ${restored}. For safety, we recommend resetting your password too.`
              : "Your account email has been restored. For safety, we recommend resetting your password too.",
          });
        } else {
          setStatus({
            kind: "error",
            title: "Unsupported action",
            message: "This type of request isn't supported.",
          });
        }
      } catch (err) {
        setStatus({
          kind: "error",
          title: "Something went wrong",
          message: describeActionError(err),
        });
      }
    })();
  }, [mode, oobCode]);

  // Focus the password field once the reset form is shown.
  useEffect(() => {
    if (status.kind === "reset") pwRef.current?.focus();
  }, [status.kind]);

  useEffect(() => {
    document.title = "Credentials Manager - Account";
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!oobCode) return;

    setBusy(true);
    try {
      const fb = await getFirebase();
      if (!fb) throw new Error("Account actions aren't available right now.");
      const { confirmPasswordReset } = await import("firebase/auth");
      await confirmPasswordReset(fb.auth, oobCode, password);
      setStatus({
        kind: "success",
        title: "Password updated",
        message: "Your password has been changed. You can now sign in with your new password.",
      });
    } catch (err) {
      setError(describeActionError(err));
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    status.kind === "reset"
      ? "Choose a new password for your account."
      : status.kind === "success"
        ? "All set."
        : status.kind === "error"
          ? "We hit a snag."
          : "Just a moment...";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-7 shadow-glow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-md shadow-brand-500/30">
            <IconShield size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Credentials Manager</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {status.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-slate-500 dark:text-slate-400">
            <IconSpinner size={26} className="text-brand-500" />
            Verifying your link...
          </div>
        )}

        {status.kind === "reset" && (
          <>
            <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Reset your password
            </h2>
            {status.email && (
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                for{" "}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {status.email}
                </span>
              </p>
            )}

            <form className="space-y-4" onSubmit={handleReset}>
              {/* Lets browser/password managers associate the saved password
                  with the right account. Visually hidden, not interactive. */}
              <input
                type="email"
                name="email"
                value={status.email ?? ""}
                autoComplete="username"
                readOnly
                hidden
              />

              <div>
                <label className="label" htmlFor="new-pw">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-pw"
                    name="new-password"
                    ref={pwRef}
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    className="input pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    required
                  />
                  <button
                    type="button"
                    className="btn-ghost absolute inset-y-0 right-1 !my-1 !px-2 !py-1"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={password} />
              </div>

              <div>
                <label className="label" htmlFor="confirm-pw">
                  Confirm new password
                </label>
                <input
                  id="confirm-pw"
                  name="confirm-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                <IconKey size={16} />
                {busy ? "Updating..." : "Update password"}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                className="text-brand-700 hover:underline dark:text-brand-300"
                onClick={goToApp}
                disabled={busy}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}

        {status.kind === "success" && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <IconCheckCircle size={32} />
            </div>
            <h2 className="mb-1.5 text-base font-semibold text-slate-800 dark:text-slate-100">
              {status.title}
            </h2>
            <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {status.message}
            </p>
            <button type="button" className="btn-primary w-full" onClick={goToApp}>
              Continue to sign in
            </button>
          </div>
        )}

        {status.kind === "error" && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
              <IconAlertCircle size={32} />
            </div>
            <h2 className="mb-1.5 text-base font-semibold text-slate-800 dark:text-slate-100">
              {status.title}
            </h2>
            <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {status.message}
            </p>
            <button type="button" className="btn-secondary w-full" onClick={goToApp}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
