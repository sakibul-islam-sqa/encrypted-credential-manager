import { useMemo, useState } from "react";
import type { UrlEntry } from "../types";
import { ENVIRONMENTS } from "../types";
import { copyToClipboard } from "../lib/clipboard";
import { envColor } from "../lib/envColor";
import { FILTER_ALL, NO_VARIANT_KEY } from "../lib/constants";
import { useToast } from "./Toast";
import EmptyState from "./EmptyState";
import SearchInput from "./SearchInput";
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconExternal,
  IconFilter,
  IconGlobe,
  IconPlus,
  IconTrash,
} from "./Icon";

interface Props {
  urls: UrlEntry[];
  onAdd: () => void;
  onEdit: (entry: UrlEntry) => void;
  onDelete: (entry: UrlEntry) => void;
}

const NO_VARIANT = NO_VARIANT_KEY;

function envRank(env: string): number {
  const idx = ENVIRONMENTS.indexOf(env as (typeof ENVIRONMENTS)[number]);
  return idx === -1 ? ENVIRONMENTS.length + 1 : idx;
}

interface AppGroup {
  app: string;
  variants: string[];
  envs: string[];
  cells: Map<string, UrlEntry[]>;
}

function groupByApp(urls: UrlEntry[]): AppGroup[] {
  const apps = new Map<string, AppGroup>();
  for (const u of urls) {
    let g = apps.get(u.app);
    if (!g) {
      g = { app: u.app, variants: [], envs: [], cells: new Map() };
      apps.set(u.app, g);
    }
    const variantKey = u.variant?.trim() || NO_VARIANT;
    if (!g.variants.includes(variantKey)) g.variants.push(variantKey);
    const envKey = String(u.environment);
    if (!g.envs.includes(envKey)) g.envs.push(envKey);
    const cellKey = `${envKey}::${variantKey}`;
    const existing = g.cells.get(cellKey) ?? [];
    existing.push(u);
    g.cells.set(cellKey, existing);
  }
  const out = Array.from(apps.values());
  out.sort((a, b) => a.app.localeCompare(b.app));
  for (const g of out) {
    g.variants.sort((a, b) => {
      if (a === NO_VARIANT) return -1;
      if (b === NO_VARIANT) return 1;
      return a.localeCompare(b);
    });
    g.envs.sort((a, b) => envRank(a) - envRank(b) || a.localeCompare(b));
  }
  return out;
}

export default function UrlsView({ urls, onAdd, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState(FILTER_ALL);
  const [envFilter, setEnvFilter] = useState(FILTER_ALL);

  const knownApps = useMemo(() => {
    const set = new Set<string>();
    urls.forEach((u) => set.add(u.app));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [urls]);

  const knownEnvs = useMemo(() => {
    const set = new Set<string>();
    urls.forEach((u) => set.add(String(u.environment)));
    return Array.from(set).sort((a, b) => envRank(a) - envRank(b) || a.localeCompare(b));
  }, [urls]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return urls
      .filter((u) => (appFilter === FILTER_ALL ? true : u.app === appFilter))
      .filter((u) => (envFilter === FILTER_ALL ? true : String(u.environment) === envFilter))
      .filter((u) => {
        if (!q) return true;
        const hay = [u.app, u.variant, String(u.environment), u.url, u.label, u.notes]
          .filter(Boolean)
          .join(" \n ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [urls, query, appFilter, envFilter]);

  const groups = useMemo(() => groupByApp(filtered), [filtered]);

  return (
    <>
      <section className="card mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          className="flex-1"
          name="urls-search"
          label="Search URLs"
          placeholder="Search app, variant, env, URL, label, notes..."
          value={query}
          onChange={setQuery}
        />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <IconFilter size={14} />
            <span className="hidden sm:inline">Filter</span>
          </div>
          <select
            name="urls-app-filter"
            className="input !w-auto !py-1.5"
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            aria-label="Filter by app"
          >
            <option value={FILTER_ALL}>All apps</option>
            {knownApps.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            name="urls-env-filter"
            className="input !w-auto !py-1.5"
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            aria-label="Filter by environment"
          >
            <option value={FILTER_ALL}>All envs</option>
            {knownEnvs.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary sm:ml-1" onClick={onAdd}>
            <IconPlus size={16} />
            <span>Add</span>
          </button>
        </div>
      </section>

      {urls.length === 0 ? (
        <UrlsEmptyState onAdd={onAdd} />
      ) : groups.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No URLs match your search and filters.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <AppMatrix key={g.app} group={g} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </>
  );
}

function AppMatrix({
  group,
  onEdit,
  onDelete,
}: {
  group: AppGroup;
  onEdit: (entry: UrlEntry) => void;
  onDelete: (entry: UrlEntry) => void;
}) {
  const totalCells = group.envs.length * group.variants.length;
  const filledCells = Array.from(group.cells.values()).reduce((acc, list) => acc + list.length, 0);

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800/70">
        <h2 className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {group.app}
          </span>
          <span className="text-[11px] text-slate-500">
            {filledCells} URL{filledCells === 1 ? "" : "s"}
            {totalCells > filledCells
              ? ` - ${totalCells - filledCells} empty cell${totalCells - filledCells === 1 ? "" : "s"}`
              : ""}
          </span>
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
              <th className="w-28 border-b border-slate-200 px-4 py-2 dark:border-slate-800/70">
                Environment
              </th>
              {group.variants.map((v) => (
                <th
                  key={v}
                  className="border-b border-l border-slate-200 px-4 py-2 dark:border-slate-800/70"
                >
                  {v === NO_VARIANT ? "URL" : v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.envs.map((env) => (
              <tr
                key={env}
                className="border-b border-slate-200 last:border-b-0 dark:border-slate-800/70"
              >
                <td className="align-top px-4 py-2.5">
                  <span className={`chip border ${envColor(env)}`}>{env}</span>
                </td>
                {group.variants.map((v) => {
                  const items = group.cells.get(`${env}::${v}`) ?? [];
                  return (
                    <td
                      key={v}
                      className="border-l border-slate-200 px-3 py-2 align-top dark:border-slate-800/70"
                    >
                      {items.length === 0 ? (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map((entry) => (
                            <UrlCell
                              key={entry.id}
                              entry={entry}
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UrlCell({
  entry,
  onEdit,
  onDelete,
}: {
  entry: UrlEntry;
  onEdit: (entry: UrlEntry) => void;
  onDelete: (entry: UrlEntry) => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(entry.url);
    if (ok) {
      setCopied(true);
      toast.show("URL copied", "success");
      window.setTimeout(() => setCopied(false), 1200);
    } else {
      toast.show("Copy failed", "error");
    }
  }

  return (
    <div className="group flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40">
      <a
        href={entry.url}
        target="_blank"
        rel="noreferrer noopener"
        className="flex min-w-0 flex-1 items-center gap-1 truncate font-mono text-[12px] text-slate-800 hover:text-brand-700 hover:underline dark:text-slate-200 dark:hover:text-brand-300"
        title={entry.url}
      >
        <span className="truncate">{entry.label || entry.url}</span>
        <IconExternal size={11} className="shrink-0 opacity-70" />
      </a>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          className="btn-ghost !px-1.5 !py-1"
          onClick={copy}
          aria-label="Copy URL"
          title="Copy URL"
        >
          {copied ? <IconCheck size={13} className="text-emerald-500" /> : <IconCopy size={13} />}
        </button>
        <button
          type="button"
          className="btn-ghost !px-1.5 !py-1"
          onClick={() => onEdit(entry)}
          aria-label="Edit URL"
          title="Edit"
        >
          <IconEdit size={13} />
        </button>
        <button
          type="button"
          className="btn-ghost !px-1.5 !py-1 hover:!bg-rose-100 hover:!text-rose-700 dark:hover:!bg-rose-900/40 dark:hover:!text-rose-200"
          onClick={() => onDelete(entry)}
          aria-label="Delete URL"
          title="Delete"
        >
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}

function UrlsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<IconGlobe size={26} />}
      title="No URLs saved yet"
      description="Save app URLs per environment (Dev / Stage / Prod) and optional variants (AWS / GCP) - all encrypted in this browser."
      action={
        <button type="button" className="btn-primary" onClick={onAdd}>
          <IconPlus size={16} /> Add your first URL
        </button>
      }
    />
  );
}
