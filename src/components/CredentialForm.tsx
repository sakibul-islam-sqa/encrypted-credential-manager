import { useEffect, useMemo, useState } from "react";
import type { CredentialEntry } from "../types";
import { generatePassword } from "../lib/crypto";
import { IconEye, IconEyeOff, IconRefresh } from "./Icon";

interface Props {
  initial?: Partial<CredentialEntry>;
  urlAppEnvs: Record<string, string[]>;
  onSubmit: (data: Omit<CredentialEntry, "id" | "createdAt" | "updatedAt">) => void;
}

function envsForApp(map: Record<string, string[]>, app: string | undefined): string[] {
  if (!app) return [];
  const raw = map[app] ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const env of raw) {
    const trimmed = env?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export default function CredentialForm({ initial, urlAppEnvs, onSubmit }: Props) {
  const appOptions = useMemo(
    () => Object.keys(urlAppEnvs).sort((a, b) => a.localeCompare(b)),
    [urlAppEnvs]
  );
  const hasAppOptions = appOptions.length > 0;

  const [appMode, setAppMode] = useState<"preset" | "custom">(() => {
    if (!hasAppOptions) return "custom";
    const a = initial?.app;
    if (!a) return "preset";
    return appOptions.includes(a) ? "preset" : "custom";
  });

  const [app, setApp] = useState<string>(() => {
    if (initial?.app && appOptions.includes(initial.app)) return initial.app;
    return appOptions[0] ?? "";
  });
  const [customApp, setCustomApp] = useState<string>(() => {
    if (!initial?.app) return "";
    return appOptions.includes(initial.app) ? "" : initial.app;
  });

  const currentApp = appMode === "preset" ? app : customApp.trim();
  const envOptions = useMemo(() => envsForApp(urlAppEnvs, currentApp), [urlAppEnvs, currentApp]);
  const hasEnvOptions = envOptions.length > 0;

  const [envMode, setEnvMode] = useState<"preset" | "custom">(() => {
    if (!hasEnvOptions) return "custom";
    const env = initial?.environment;
    if (!env) return "preset";
    return envOptions.includes(String(env)) ? "preset" : "custom";
  });
  const [environment, setEnvironment] = useState<string>(() => {
    if (initial?.environment && envOptions.includes(String(initial.environment))) {
      return String(initial.environment);
    }
    return "";
  });
  const [customEnv, setCustomEnv] = useState<string>(() => {
    if (!initial?.environment) return "";
    return envOptions.includes(String(initial.environment)) ? "" : String(initial.environment);
  });

  const [username, setUsername] = useState(initial?.username ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showPw, setShowPw] = useState(false);

  // React to app changes - keep environment in sync with the chosen app's
  // available envs. If the app has no URL envs (or app is in custom mode),
  // fall back to a custom env input.
  useEffect(() => {
    if (envOptions.length === 0) {
      if (envMode !== "custom") setEnvMode("custom");
      return;
    }
    if (envMode === "preset" && environment && !envOptions.includes(environment)) {
      setEnvironment("");
    }
    // intentionally only depend on envOptions; user-driven envMode changes
    // shouldn't retrigger this auto-sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envOptions]);

  function regen() {
    setPassword(generatePassword(20));
    setShowPw(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const resolvedApp = appMode === "custom" ? customApp.trim() : app;
    const resolvedEnv = (envMode === "custom" ? customEnv.trim() : environment.trim()) || undefined;
    onSubmit({
      app: resolvedApp,
      environment: resolvedEnv,
      username: username.trim() || undefined,
      email: email.trim() || undefined,
      password: password || undefined,
      role: role.trim() || undefined,
      tags,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form id="credential-form" className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-app">
            Application *
          </label>
          <div className="flex gap-2">
            {appMode === "preset" && hasAppOptions ? (
              <select
                id="cf-app"
                className="input"
                value={app}
                onChange={(e) => setApp(e.target.value)}
              >
                {appOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="cf-app"
                className="input"
                value={customApp}
                onChange={(e) => setCustomApp(e.target.value)}
                placeholder={hasAppOptions ? "Custom application name" : "e.g. Live SCP"}
                required
              />
            )}
            {hasAppOptions && (
              <button
                type="button"
                className="btn-secondary !px-2 whitespace-nowrap"
                onClick={() => setAppMode((m) => (m === "preset" ? "custom" : "preset"))}
                title="Toggle between URL-tab applications and a custom one"
              >
                {appMode === "preset" ? "Custom" : "From URLs"}
              </button>
            )}
          </div>
          {!hasAppOptions && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              No applications yet. Add a URL in the URLs tab to populate this dropdown.
            </p>
          )}
        </div>

        <div>
          <label className="label">Environment</label>
          <div className="flex gap-2">
            {envMode === "preset" && hasEnvOptions ? (
              <select
                className="input"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="">None</option>
                {envOptions.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={customEnv}
                onChange={(e) => setCustomEnv(e.target.value)}
                placeholder={
                  hasEnvOptions
                    ? "Custom environment name (optional)"
                    : "Environment (optional, e.g. DEV)"
                }
              />
            )}
            {hasEnvOptions && (
              <button
                type="button"
                className="btn-secondary !px-2 whitespace-nowrap"
                onClick={() => setEnvMode((m) => (m === "preset" ? "custom" : "preset"))}
                title="Toggle between this app's URL environments and a custom one"
              >
                {envMode === "preset" ? "Custom" : "From URLs"}
              </button>
            )}
          </div>
          {!hasEnvOptions && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              {appMode === "custom" || !currentApp
                ? "Pick a URL-tab application above, or type a custom environment."
                : `No URL environments for "${currentApp}" yet. Add one in the URLs tab.`}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-username">
            Username
          </label>
          <input
            id="cf-username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="qa.user"
          />
        </div>
        <div>
          <label className="label" htmlFor="cf-email">
            Email
          </label>
          <input
            id="cf-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="qa@example.com"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="cf-password">
          Password
        </label>
        <div className="relative">
          <input
            id="cf-password"
            type={showPw ? "text" : "password"}
            className="input pr-24 font-mono"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="off"
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            <button
              type="button"
              className="btn-ghost !px-2 !py-1"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              title={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
            <button
              type="button"
              className="btn-ghost !px-2 !py-1"
              onClick={regen}
              aria-label="Generate strong password"
              title="Generate strong password"
            >
              <IconRefresh size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-role">
            Role
          </label>
          <input
            id="cf-role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Admin, Tester, Customer..."
          />
        </div>
        <div>
          <label className="label" htmlFor="cf-tags">
            Tags (comma separated)
          </label>
          <input
            id="cf-tags"
            className="input"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="smoke, regression"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="cf-notes">
          Notes
        </label>
        <textarea
          id="cf-notes"
          className="input min-h-[80px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="OTP secret, special instructions, etc."
        />
      </div>
    </form>
  );
}
