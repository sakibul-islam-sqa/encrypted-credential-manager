import { useMemo, useState } from "react";
import type { CredentialEntry } from "../types";
import { FILTER_ALL } from "../lib/constants";
import CredentialCard from "./CredentialCard";
import EmptyState from "./EmptyState";
import SearchInput from "./SearchInput";
import { IconFilter, IconPlus, IconShield } from "./Icon";

interface Props {
  entries: CredentialEntry[];
  onAdd: () => void;
  onEdit: (entry: CredentialEntry) => void;
  onDelete: (entry: CredentialEntry) => void;
}

/**
 * Credentials tab: search + app/env filters + grouped card grid.
 *
 * Filter / search state lives here so that switching tabs in the parent
 * doesn't reset it on its own.
 */
export default function CredentialsView({ entries, onAdd, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState<string>(FILTER_ALL);
  const [envFilter, setEnvFilter] = useState<string>(FILTER_ALL);

  const knownApps = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.app));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const knownEnvs = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.environment) set.add(String(e.environment));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (appFilter === FILTER_ALL ? true : e.app === appFilter))
      .filter((e) =>
        envFilter === FILTER_ALL ? true : !!e.environment && String(e.environment) === envFilter
      )
      .filter((e) => {
        if (!q) return true;
        const hay = [
          e.app,
          e.environment ? String(e.environment) : "",
          e.url,
          e.username,
          e.email,
          e.role,
          e.notes,
          ...(e.tags ?? []),
        ]
          .filter(Boolean)
          .join(" \n ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [entries, query, envFilter, appFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CredentialEntry[]>();
    for (const e of filtered) {
      const key = e.app;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <>
      <section className="card mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <SearchInput
          className="flex-1"
          name="credentials-search"
          label="Search credentials"
          placeholder="Search app, URL, username, tag, notes..."
          value={query}
          onChange={setQuery}
        />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <IconFilter size={14} />
            <span className="hidden sm:inline">Filter</span>
          </div>
          <select
            name="credentials-app-filter"
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
            name="credentials-env-filter"
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

      {entries.length === 0 ? (
        <EmptyState
          icon={<IconShield size={26} />}
          title="Your vault is empty"
          description="Add your first credential - it'll be encrypted in this browser before it leaves."
          action={
            <button type="button" className="btn-primary" onClick={onAdd}>
              <IconPlus size={16} /> Add your first credential
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No credentials match your search and filters.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([app, items]) => (
            <section key={app}>
              <h2 className="mb-3 flex items-baseline gap-2 px-1">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {app}
                </span>
                <span className="text-[11px] text-slate-500">
                  {items.length} entr{items.length === 1 ? "y" : "ies"}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => (
                  <CredentialCard
                    key={entry.id}
                    entry={entry}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
