import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { translateAuthError } from "../lib/firebase";
import { MIN_PASSWORD_LENGTH } from "../lib/constants";
import { offerCredentialToBrowser } from "../lib/credentialStore";
import { useToast } from "./Toast";
import ThemeToggle from "./ThemeToggle";
import { IconEye, IconEyeOff, IconKey, IconShield, IconUnlock } from "./Icon";

type Mode = "signin" | "signup" | "reset";

export default function SignInScreen() {
  const { signIn, signUp, signInWithGoogle, sendPasswordReset, cloudEnabled, loading } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    setInfo(null);
  }, [mode]);

  if (!cloudEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-7 text-sm text-slate-600 dark:text-slate-300">
          <h1 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            Firebase is not configured
          </h1>
          <p>
            This app requires Firebase Auth and Firestore. Set the{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">VITE_FIREBASE_*</code>{" "}
            environment variables (see <code>.env.example</code>) and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        await sendPasswordReset(email);
        // Firebase's email-enumeration protection means we cannot tell from
        // the client whether the email is registered or uses a password
        // provider. Show a soft hint that covers all cases.
        setInfo(
          "If a password account exists for this email, a reset link is on the way. Check your spam folder. Google sign-in accounts don’t have a password to reset — use “Continue with Google” instead."
        );
      } else if (mode === "signup") {
        if (password.length < MIN_PASSWORD_LENGTH) {
          setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
          setBusy(false);
          return;
        }
        await signUp(email, password);
        await offerCredentialToBrowser(email, password);
        toast.show("Welcome! Account created.", "success");
      } else {
        await signIn(email, password);
        await offerCredentialToBrowser(email, password);
        toast.show("Welcome back!", "success");
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      toast.show("Signed in with Google", "success");
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset password";
  const subtitle =
    mode === "signin"
      ? "Welcome back. Sign in to access your credential vault."
      : mode === "signup"
        ? "Sign up to start saving credentials across apps and environments."
        : "Enter your email and we'll send you a reset link.";
  const cta =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email";

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

        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
            Loading...
          </div>
        ) : (
          <>
            {mode !== "reset" && (
              <>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
                <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  or with email
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
              </>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="label" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  name="email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {mode !== "reset" && (
                <div>
                  <label className="label" htmlFor="auth-pw">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-pw"
                      name="password"
                      type={showPw ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      className="input pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === "signup"
                          ? `At least ${MIN_PASSWORD_LENGTH} characters`
                          : "Your password"
                      }
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
                </div>
              )}

              {error && (
                <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
                  {error}
                </div>
              )}

              {info && (
                <div className="rounded-md border border-brand-300 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-800/60 dark:bg-brand-950/40 dark:text-brand-200">
                  {info}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {mode === "signup" ? <IconKey size={16} /> : <IconUnlock size={16} />}
                {busy ? "Please wait..." : cta}
              </button>
            </form>

            <div className="mt-5 space-y-2 text-center text-xs text-slate-500 dark:text-slate-400">
              {mode === "signin" && (
                <>
                  <div>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="text-brand-700 hover:underline dark:text-brand-300"
                      onClick={() => {
                        setError(null);
                        setMode("signup");
                      }}
                      disabled={busy}
                    >
                      Create one
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={() => {
                        setError(null);
                        setMode("reset");
                      }}
                      disabled={busy}
                    >
                      Forgot your password?
                    </button>
                  </div>
                </>
              )}
              {mode === "signup" && (
                <div>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-brand-700 hover:underline dark:text-brand-300"
                    onClick={() => {
                      setError(null);
                      setMode("signin");
                    }}
                    disabled={busy}
                  >
                    Sign in
                  </button>
                </div>
              )}
              {mode === "reset" && (
                <button
                  type="button"
                  className="text-brand-700 hover:underline dark:text-brand-300"
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                  disabled={busy}
                >
                  Back to sign in
                </button>
              )}
            </div>

            <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/40 dark:text-slate-400">
              You&apos;ll stay signed in for 7 days, then you&apos;ll be asked to log in again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
