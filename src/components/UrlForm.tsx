import { useEffect, useState } from "react";
import type { UrlEntry } from "../types";
import { ENVIRONMENTS } from "../types";

interface Props {
  initial?: Partial<UrlEntry>;
  knownApps: string[];
  knownVariants: string[];
  onSubmit: (data: Omit<UrlEntry, "id" | "createdAt" | "updatedAt">) => void;
}

export default function UrlForm({ initial, knownApps, knownVariants, onSubmit }: Props) {
  const [app, setApp] = useState(initial?.app ?? "");
  const [variant, setVariant] = useState(initial?.variant ?? "");
  const [environment, setEnvironment] = useState<string>(initial?.environment ?? "Dev");
  const [customEnv, setCustomEnv] = useState("");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [envMode, setEnvMode] = useState<"preset" | "custom">(
    initial?.environment && !ENVIRONMENTS.includes(initial.environment as never)
      ? "custom"
      : "preset"
  );

  useEffect(() => {
    if (envMode === "custom" && initial?.environment) {
      setCustomEnv(String(initial.environment));
    }
  }, [envMode, initial?.environment]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      app: app.trim(),
      variant: variant.trim() || undefined,
      environment: (envMode === "custom" ? customEnv.trim() : environment) || "Other",
      url: url.trim(),
      label: label.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form id="url-form" className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="uf-app">
            Application *
          </label>
          <input
            id="uf-app"
            list="known-url-apps"
            className="input"
            required
            value={app}
            onChange={(e) => setApp(e.target.value)}
            placeholder="e.g. Live SCP"
          />
          <datalist id="known-url-apps">
            {knownApps.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="uf-variant">
            Variant
          </label>
          <input
            id="uf-variant"
            list="known-url-variants"
            className="input"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="e.g. AWS, GCP (optional)"
          />
          <datalist id="known-url-variants">
            {knownVariants.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            Use this when one app has multiple deployments per environment (e.g. AWS / GCP).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Environment *</label>
          <div className="flex gap-2">
            {envMode === "preset" ? (
              <select
                className="input"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                {ENVIRONMENTS.map((env) => (
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
                placeholder="Custom environment name"
                required
              />
            )}
            <button
              type="button"
              className="btn-secondary !px-2 whitespace-nowrap"
              onClick={() => setEnvMode((m) => (m === "preset" ? "custom" : "preset"))}
              title="Toggle between preset and custom environment"
            >
              {envMode === "preset" ? "Custom" : "Preset"}
            </button>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="uf-label">
            Label
          </label>
          <input
            id="uf-label"
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional display label"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="uf-url">
          URL *
        </label>
        <input
          id="uf-url"
          type="url"
          className="input"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://dev-scp.example.com/"
        />
      </div>

      <div>
        <label className="label" htmlFor="uf-notes">
          Notes
        </label>
        <textarea
          id="uf-notes"
          className="input min-h-[64px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this endpoint"
        />
      </div>
    </form>
  );
}
