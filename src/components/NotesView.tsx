import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { NoteEntry } from "../types";
import RichEditor from "./RichEditor";
import Modal from "./Modal";
import EmptyState from "./EmptyState";
import {
  IconCheck,
  IconEdit,
  IconNote,
  IconPlus,
  IconSearch,
  IconSpinner,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconX,
} from "./Icon";

export interface NotesViewHandle {
  attemptNavigateAway: (cb: () => void) => boolean;
}

interface Props {
  notes: NoteEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
  onUpdate: (id: string, patch: Partial<NoteEntry>) => Promise<void> | void;
  onDelete: (id: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const NotesView = forwardRef<NotesViewHandle, Props>(function NotesView(
  {
    notes,
    selectedId,
    onSelect,
    onCreate,
    onUpdate,
    onDelete,
    onDirtyChange,
  },
  ref
) {
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("__ALL__");
  const editorRef = useRef<NoteEditorHandle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { kind: "select"; id: string | null }
    | { kind: "create" }
    | { kind: "navigate"; cb: () => void }
    | null
  >(null);
  const [pendingSaving, setPendingSaving] = useState(false);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useImperativeHandle(
    ref,
    () => ({
      attemptNavigateAway(cb: () => void): boolean {
        if (!isDirty) return true;
        setPendingAction({ kind: "navigate", cb });
        return false;
      },
    }),
    [isDirty]
  );

  function attemptSelect(id: string | null) {
    if (id === selectedId) return;
    if (isDirty) {
      setPendingAction({ kind: "select", id });
      return;
    }
    onSelect(id);
  }

  function attemptCreate() {
    if (isDirty) {
      setPendingAction({ kind: "create" });
      return;
    }
    onCreate();
  }

  function applyPending() {
    if (!pendingAction) return;
    if (pendingAction.kind === "select") onSelect(pendingAction.id);
    else if (pendingAction.kind === "create") onCreate();
    else if (pendingAction.kind === "navigate") pendingAction.cb();
    setPendingAction(null);
  }

  async function handleModalSave() {
    if (pendingSaving) return;
    setPendingSaving(true);
    try {
      const ok = await editorRef.current?.save();
      if (ok) applyPending();
      else setPendingAction(null);
    } finally {
      setPendingSaving(false);
    }
  }
  function handleModalDiscard() {
    if (pendingSaving) return;
    editorRef.current?.cancel();
    applyPending();
  }
  function handleModalStay() {
    if (pendingSaving) return;
    setPendingAction(null);
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => (tagFilter === "__ALL__" ? true : (n.tags ?? []).includes(tagFilter)))
      .filter((n) => {
        if (!q) return true;
        const hay = [n.title, n.body, ...(n.tags ?? [])].join(" \n ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const ap = a.pinned ? 1 : 0;
        const bp = b.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, query, tagFilter]);

  const selected = selectedId ? (notes.find((n) => n.id === selectedId) ?? null) : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="card flex max-h-[calc(100vh-220px)] flex-col overflow-hidden p-0 md:sticky md:top-[68px] md:min-h-[60vh]">
        <div className="space-y-3 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-transparent p-3 dark:border-slate-800/60 dark:from-slate-900/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Notes
              </h3>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {filtered.length}
                {filtered.length !== notes.length ? ` / ${notes.length}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="btn-primary !px-2.5 !py-1.5 !text-xs shadow-sm shadow-brand-500/20"
              onClick={attemptCreate}
              title="New note"
            >
              <IconPlus size={14} />
              <span>New</span>
            </button>
          </div>
          <div className="relative">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              className="input !py-2 pl-8 pr-8 text-xs"
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear"
              >
                <IconX size={12} />
              </button>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TagPill
                active={tagFilter === "__ALL__"}
                onClick={() => setTagFilter("__ALL__")}
                label="All"
              />
              {allTags.map((t) => (
                <TagPill
                  key={t}
                  active={tagFilter === t}
                  onClick={() => setTagFilter(t)}
                  label={`#${t}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="rounded-full bg-slate-100 p-2.5 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
                {notes.length === 0 ? <IconNote size={18} /> : <IconSearch size={18} />}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {notes.length === 0
                  ? "No notes yet. Create your first one."
                  : "No notes match your search."}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5 p-1.5">
              {filtered.map((n) => {
                const active = selectedId === n.id;
                const preview = summarize(n.body);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`group relative flex w-full items-start gap-2.5 overflow-hidden rounded-lg px-2.5 py-2.5 text-left transition-all duration-150 ${
                        active
                          ? "bg-brand-50 ring-1 ring-brand-200/70 dark:bg-brand-500/10 dark:ring-brand-400/20"
                          : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                      }`}
                      onClick={() => attemptSelect(n.id)}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-500 transition-opacity ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`min-w-0 flex-1 truncate text-sm font-semibold tracking-tight ${
                              active
                                ? "text-brand-900 dark:text-brand-100"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {n.title || "Untitled"}
                          </span>
                          {active && isDirty && (
                            <span
                              className="relative mt-1.5 inline-flex h-2 w-2 shrink-0"
                              title="Unsaved changes"
                              aria-label="Unsaved changes"
                            >
                              <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-60" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                            </span>
                          )}
                          {n.pinned && (
                            <span
                              className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-300"
                              aria-label="Pinned"
                              title="Pinned"
                            >
                              <IconStarFilled size={12} />
                            </span>
                          )}
                        </div>
                        {preview && (
                          <p className="mt-0.5 line-clamp-1 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
                            {preview}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-slate-400 dark:text-slate-500">
                          <span className="font-medium">{formatRelativeTime(n.updatedAt)}</span>
                          {(n.tags?.length ?? 0) > 0 && (
                            <>
                              <span aria-hidden>·</span>
                              <div className="flex min-w-0 flex-wrap gap-1">
                                {n.tags!.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                      active
                                        ? "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-400"
                                    }`}
                                  >
                                    #{t}
                                  </span>
                                ))}
                                {(n.tags?.length ?? 0) > 2 && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    +{(n.tags?.length ?? 0) - 2}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="card min-h-[60vh] p-0">
        {!selected ? (
          <EmptyNoteState hasNotes={notes.length > 0} onCreate={attemptCreate} />
        ) : (
          <NoteEditor
            key={selected.id}
            ref={editorRef}
            note={selected}
            onChange={(patch) => onUpdate(selected.id, patch)}
            onDelete={() => onDelete(selected.id)}
            onDirtyChange={setIsDirty}
          />
        )}
      </section>

      <Modal
        open={pendingAction !== null}
        title="Unsaved changes"
        onClose={handleModalStay}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleModalStay}
              disabled={pendingSaving}
            >
              Keep editing
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleModalDiscard}
              disabled={pendingSaving}
            >
              <IconX size={14} /> Discard
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleModalSave()}
              disabled={pendingSaving}
            >
              {pendingSaving ? <IconSpinner size={14} /> : <IconCheck size={14} />}
              {pendingSaving ? "Saving..." : "Save & continue"}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          You have unsaved changes in this note. Save them, discard them, or stay to keep editing.
        </p>
      </Modal>
    </div>
  );
});

export default NotesView;

function TagPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700/80"
      }`}
    >
      {label}
    </button>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.round(day / 7)}w ago`;
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function summarize(body: string): string {
  return body
    .replace(/<pre[\s\S]*?<\/pre>/gi, " [code] ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/[#>*_`~]+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function EmptyNoteState({ hasNotes, onCreate }: { hasNotes: boolean; onCreate: () => void }) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<IconNote size={26} />}
        title={hasNotes ? "Select a note" : "Your first note awaits"}
        description="Rich-text notes with code blocks, tables, task lists and links. Like credentials, they're encrypted in this browser before they leave."
        className="!border-0 !bg-transparent !shadow-none"
        action={
          <button type="button" className="btn-primary" onClick={onCreate}>
            <IconPlus size={16} /> New note
          </button>
        }
      />
    </div>
  );
}

interface NoteEditorHandle {
  save: () => Promise<boolean>;
  cancel: () => void;
  isDirty: () => boolean;
}

interface NoteEditorProps {
  note: NoteEntry;
  onChange: (patch: Partial<NoteEntry>) => Promise<void> | void;
  onDelete: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditor(
  { note, onChange, onDelete, onDirtyChange },
  ref
) {
  const savedBody = useMemo(
    () => migrateBodyToHtml(note),
    // We intentionally depend on the specific fields rather than `note` so a
    // tag-only change doesn't re-derive the body (preserving editor state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [note.id, note.body, note.format]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note.title);
  const [draftBody, setDraftBody] = useState(savedBody);
  const [draftTags, setDraftTags] = useState((note.tags ?? []).join(", "));
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fresh =
      note.body === "" && note.title === "Untitled" && note.createdAt === note.updatedAt;
    setIsEditing(fresh);
    setDraftTitle(note.title);
    setDraftBody(migrateBodyToHtml(note));
    setDraftTags((note.tags ?? []).join(", "));
    // Reset draft state ONLY when the user navigates between notes, not on
    // every keystroke that mutates `note` upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const hasChanges =
    draftTitle !== note.title ||
    draftBody !== savedBody ||
    draftTags !== (note.tags ?? []).join(", ");

  const dirty = isEditing && hasChanges;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(
    () => () => {
      onDirtyChange?.(false);
    },
    [onDirtyChange]
  );

  function startEditing(focusTitle = false) {
    if (isEditing) return;
    setDraftTitle(note.title);
    setDraftBody(savedBody);
    setDraftTags((note.tags ?? []).join(", "));
    setIsEditing(true);
    if (focusTitle) {
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }

  function cancelEditing() {
    if (saving) return;
    setIsEditing(false);
    setDraftTitle(note.title);
    setDraftBody(savedBody);
    setDraftTags((note.tags ?? []).join(", "));
  }

  async function save(): Promise<boolean> {
    if (saving) return false;
    const tags = draftTags
      .split(",")
      .map((s) => s.trim().replace(/^#/, ""))
      .filter(Boolean);
    const patch: Partial<NoteEntry> = {
      title: draftTitle,
      body: draftBody,
      format: "html",
      tags,
    };
    setSaving(true);
    try {
      await Promise.resolve(onChange(patch));
      setIsEditing(false);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      save,
      cancel: cancelEditing,
      isDirty: () => dirty,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dirty, saving, draftTitle, draftBody, draftTags, note]
  );

  function togglePin() {
    void Promise.resolve(onChange({ pinned: !note.pinned })).catch(() => undefined);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!isEditing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void save();
    }
  }

  const displayTags = note.tags ?? [];

  return (
    <div className="flex h-full min-h-[60vh] flex-col" onKeyDown={onKeyDown}>
      <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800/70 sm:flex-row sm:items-center">
        {isEditing ? (
          <input
            ref={titleInputRef}
            className="input flex-1 !text-base !font-semibold"
            placeholder="Note title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
          />
        ) : (
          <h2 className="flex-1 truncate px-2 py-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            {note.title || "Untitled"}
          </h2>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`btn-ghost !px-2 !py-1.5 ${
              note.pinned ? "!text-amber-500 dark:!text-amber-300" : ""
            }`}
            onClick={togglePin}
            title={note.pinned ? "Unpin" : "Pin"}
            aria-label={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? <IconStarFilled size={16} /> : <IconStar size={16} />}
          </button>
          {!isEditing && (
            <button
              type="button"
              className="btn-ghost !px-2 !py-1.5"
              onClick={() => startEditing(true)}
              title="Edit note"
              aria-label="Edit note"
            >
              <IconEdit size={16} />
            </button>
          )}
          <button
            type="button"
            className="btn-ghost !px-2 !py-1.5 hover:!bg-rose-100 hover:!text-rose-700 dark:hover:!bg-rose-900/40 dark:hover:!text-rose-200"
            onClick={onDelete}
            title="Delete note"
            aria-label="Delete note"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800/70">
        {isEditing ? (
          <input
            className="input !py-1.5 !text-xs"
            placeholder="Tags, comma separated (e.g. api, postman, debugging)"
            value={draftTags}
            onChange={(e) => setDraftTags(e.target.value)}
          />
        ) : (
          <div className="flex w-full flex-wrap items-center gap-1.5 px-2 py-1.5 text-xs">
            {displayTags.length === 0 ? (
              <span className="italic text-slate-400 dark:text-slate-500">No tags</span>
            ) : (
              displayTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{t}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <RichEditor
          content={isEditing ? draftBody : savedBody}
          onUpdate={setDraftBody}
          editable={isEditing}
          autoFocus={isEditing}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
        {isEditing ? (
          <>
            <span className="flex items-center gap-1.5">
              {saving ? (
                <>
                  <IconSpinner size={12} />
                  Saving...
                </>
              ) : hasChanges ? (
                <>
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  <span className="text-amber-600 dark:text-amber-300">Unsaved changes</span>
                  <span className="hidden text-slate-400 dark:text-slate-500 sm:inline">
                    · Esc to cancel · ⌘/Ctrl+Enter to save
                  </span>
                </>
              ) : (
                <>
                  <IconCheck size={12} className="text-emerald-500" />
                  <span>No changes</span>
                </>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost" onClick={cancelEditing} disabled={saving}>
                <IconX size={14} />
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void save()}
                disabled={!hasChanges || saving}
              >
                {saving ? <IconSpinner size={14} /> : <IconCheck size={14} />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        ) : (
          <span>Last edited {new Date(note.updatedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
});

function migrateBodyToHtml(note: NoteEntry): string {
  const body = note.body ?? "";
  if (!body.trim()) return "";
  if (note.format === "html") return body;
  if (looksLikeHtml(body)) return body;
  return markdownToHtml(body);
}

function looksLikeHtml(s: string): boolean {
  const trimmed = s.trim();
  return trimmed.startsWith("<") && /<\/?[a-z][\s\S]*?>/i.test(trimmed);
}

function markdownToHtml(md: string): string {
  // Best-effort migration for legacy markdown notes. Keep it minimal -
  // common cases are fenced code blocks, headings, lists, inline code, bold/italic, links.
  let s = md;

  // Fenced code blocks
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const safeLang = (lang || "plaintext").trim();
    return `<pre><code class="language-${escapeHtml(safeLang)}">${escapeHtml(code)}</code></pre>`;
  });

  // Headings
  s = s.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  s = s.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  s = s.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Lists (very simple)
  s = s.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (_m, group: string) => {
    const items = group
      .trim()
      .split(/\n/)
      .map((l) => `<li>${l.replace(/^- /, "")}</li>`)
      .join("");
    return `\n<ul>${items}</ul>`;
  });

  // Inline code
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Bold + italic
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|\W)\*([^*]+)\*(\W|$)/g, "$1<em>$2</em>$3");

  // Links
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Paragraphs from remaining blank-line-separated chunks
  s = s
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h\d|ul|ol|pre|blockquote|table)/i.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
