import { useState } from "react";
import type { CredentialEntry } from "../types";
import { copyToClipboard } from "../lib/clipboard";
import { envColor } from "../lib/envColor";
import { useToast } from "./Toast";
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconExternal,
  IconEye,
  IconEyeOff,
  IconTrash,
} from "./Icon";

interface Props {
  entry: CredentialEntry;
  onEdit: (entry: CredentialEntry) => void;
  onDelete: (entry: CredentialEntry) => void;
}

export default function CredentialCard({ entry, onEdit, onDelete }: Props) {
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();

  async function copy(label: string, value?: string) {
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(label);
      toast.show(`${label} copied`, "success");
      window.setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200);
    } else {
      toast.show("Copy failed", "error");
    }
  }

  return (
    <div className="card group p-4 transition hover:border-brand-500/40 hover:shadow-glow">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {entry.app}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {entry.environment && (
              <span className={`chip border ${envColor(String(entry.environment))}`}>
                {entry.environment}
              </span>
            )}
            {entry.role && <span className="chip">{entry.role}</span>}
            {entry.tags?.map((t) => (
              <span key={t} className="chip !text-slate-500 dark:!text-slate-400">
                #{t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            className="btn-ghost !px-2 !py-1.5"
            onClick={() => onEdit(entry)}
            aria-label="Edit credential"
            title="Edit"
          >
            <IconEdit size={16} />
          </button>
          <button
            type="button"
            className="btn-ghost !px-2 !py-1.5 hover:!bg-rose-100 hover:!text-rose-700 dark:hover:!bg-rose-900/40 dark:hover:!text-rose-200"
            onClick={() => onDelete(entry)}
            aria-label="Delete credential"
            title="Delete"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {entry.url && (
          <Row
            label="URL"
            value={entry.url}
            mono
            href={entry.url}
            onCopy={() => copy("URL", entry.url)}
            copied={copied === "URL"}
          />
        )}
        {entry.username && (
          <Row
            label="Username"
            value={entry.username}
            onCopy={() => copy("Username", entry.username)}
            copied={copied === "Username"}
          />
        )}
        {entry.email && (
          <Row
            label="Email"
            value={entry.email}
            onCopy={() => copy("Email", entry.email)}
            copied={copied === "Email"}
          />
        )}
        {entry.password && (
          <Row
            label="Password"
            value={showPw ? entry.password : "•".repeat(Math.min(entry.password.length, 12))}
            mono
            onCopy={() => copy("Password", entry.password)}
            copied={copied === "Password"}
            extra={
              <button
                type="button"
                className="btn-ghost !px-2 !py-1"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                title={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <IconEyeOff size={14} /> : <IconEye size={14} />}
              </button>
            }
          />
        )}
        {entry.notes && (
          <div className="mt-2 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-slate-800/60 dark:bg-slate-950/50 dark:text-slate-300">
            {entry.notes}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-500">
        <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  href,
  onCopy,
  copied,
  extra,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
  onCopy: () => void;
  copied: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className={`flex min-w-0 items-center gap-1 truncate text-slate-800 hover:text-brand-700 hover:underline dark:text-slate-200 dark:hover:text-brand-300 ${
              mono ? "font-mono text-[12px]" : ""
            }`}
          >
            <span className="truncate">{value}</span>
            <IconExternal size={12} className="shrink-0 opacity-70" />
          </a>
        ) : (
          <span
            className={`truncate text-slate-800 dark:text-slate-200 ${
              mono ? "font-mono text-[12px]" : ""
            }`}
          >
            {value}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {extra}
          <button
            type="button"
            className="btn-ghost !px-2 !py-1"
            onClick={onCopy}
            aria-label={`Copy ${label.toLowerCase()}`}
            title={`Copy ${label.toLowerCase()}`}
          >
            {copied ? <IconCheck size={14} className="text-emerald-400" /> : <IconCopy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
