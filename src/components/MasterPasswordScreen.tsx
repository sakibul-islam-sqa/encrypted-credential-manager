import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import ThemeToggle from "./ThemeToggle";
import { IconEye, IconEyeOff, IconKey, IconShield, IconUnlock, IconUser } from "./Icon";
import {
  readRememberPref,
  writeRememberPref,
  REMEMBER_OPTIONS,
  type RememberDuration,
} from "../lib/keyCache";

export type MasterPasswordMode = "create" | "unlock" | "migrate";

interface Props {
  mode: MasterPasswordMode;
  legacyCount?: number;
  onSubmit: (password: string, remember: RememberDuration) => Promise<void>;
  onForgotMasterPassword: () => void;
  busy?: boolean;
  error?: string | null;
}

export default function MasterPasswordScreen({
  mode,
  legacyCount = 0,
  onSubmit,
  onForgotMasterPassword,
  busy,
  error,
}: Props) {
  const { user, signOut } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [remember, setRemember] = useState<RememberDuration>(() => readRememberPref());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isCreate = mode === "create" || mode === "migrate";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!pw) {
      setLocalError("Please enter a master password.");
      return;
    }
    if (isCreate) {
      if (pw.length < 8) {
        setLocalError("Use at least 8 characters.");
        return;
      }
      if (pw !== pw2) {
        setLocalError("Passwords do not match.");
        return;
      }
    }
    writeRememberPref(remember);
    void onSubmit(pw, remember);
  }

  const title =
    mode === "create"
      ? "Create your master password"
      : mode === "migrate"
        ? "Encrypt your existing data"
        : "Enter your master password";

  const subtitle =
    mode === "create"
      ? "This password encrypts your vault. We never send it anywhere - only you can unlock the data."
      : mode === "migrate"
        ? `You have ${legacyCount} credential${legacyCount === 1 ? "" : "s"} stored without encryption. Set a master password now to encrypt them.`
        : "Unlock your encrypted vault. Only you know this password - we cannot recover it.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-7 shadow-glow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-md shadow-brand-500/30">
            <IconShield size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Credential Manager</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {user && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800/70 dark:bg-slate-900/40">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <IconUser size={12} />
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
              Signed in as <strong>{user.email ?? user.displayName ?? "you"}</strong>
            </span>
            <button
              type="button"
              className="shrink-0 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        )}

        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="mp-pw">
              {isCreate ? "New master password" : "Master password"}
            </label>
            <div className="relative">
              <input
                id="mp-pw"
                ref={inputRef}
                type={showPw ? "text" : "password"}
                autoComplete={isCreate ? "new-password" : "current-password"}
                className="input pr-10"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={isCreate ? "At least 8 characters" : "Your master password"}
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

          {isCreate && (
            <div>
              <label className="label" htmlFor="mp-pw2">
                Confirm master password
              </label>
              <div className="relative">
                <input
                  id="mp-pw2"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  className="input pr-10"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Re-enter master password"
                  required
                />
                <button
                  type="button"
                  className="btn-ghost absolute inset-y-0 right-1 !my-1 !px-2 !py-1"
                  onClick={() => setShowPw2((v) => !v)}
                  aria-label={showPw2 ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPw2 ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="mp-remember">
              Remember on this device
            </label>
            <select
              id="mp-remember"
              className="input"
              value={remember}
              onChange={(e) => setRemember(e.target.value as RememberDuration)}
            >
              {REMEMBER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {remember === "never"
                ? "Master password is held in memory only - you'll be asked again on the next refresh."
                : "Your encryption key (not the password) is stored in this browser's secure storage and used until it expires. Anyone with access to this unlocked browser profile can decrypt the vault."}
            </p>
          </div>

          {(localError || error) && (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200">
              {localError || error}
            </div>
          )}

          {isCreate && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
              The master password is the <strong>only</strong> key to your data. We never send it
              anywhere. If you forget it, your saved credentials cannot be recovered - export
              regularly as a safety net.
            </p>
          )}

          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {isCreate ? <IconKey size={16} /> : <IconUnlock size={16} />}
            {busy
              ? mode === "create"
                ? "Creating master password..."
                : mode === "migrate"
                  ? "Encrypting data..."
                  : "Unlocking..."
              : mode === "create"
                ? "Create master password"
                : mode === "migrate"
                  ? "Encrypt my data"
                  : "Unlock"}
          </button>
        </form>

        {mode === "unlock" && (
          <div className="mt-4 text-center text-xs">
            <button
              type="button"
              className="text-rose-600 hover:underline dark:text-rose-400"
              onClick={onForgotMasterPassword}
              disabled={busy}
            >
              Forgot master password? Reset vault (deletes all saved data)
            </button>
          </div>
        )}

        <p className="mt-5 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
          <strong>Why two passwords?</strong> Your account password proves who you are to Firebase.
          Your master password encrypts your vault before it leaves this browser. They&apos;re
          separate so even Firebase can&apos;t read your saved credentials.
        </p>
      </div>
    </div>
  );
}
