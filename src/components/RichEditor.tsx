import { useEffect, useMemo, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type Editor,
  type ReactNodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import sql from "highlight.js/lib/languages/sql";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";

import "highlight.js/styles/github.css";
import {
  IconBold,
  IconChevronDown,
  IconCheck,
  IconCodeBlock,
  IconCodeInline,
  IconCopy,
  IconExternal,
  IconHeading1,
  IconHeading2,
  IconHeading3,
  IconItalic,
  IconLink,
  IconListBullet,
  IconListCheck,
  IconListOrdered,
  IconMinus,
  IconQuote,
  IconRedo,
  IconStrikethrough,
  IconTable,
  IconTrash,
  IconType,
  IconUndo,
  IconUnlink,
  IconWrap,
  IconX,
} from "./Icon";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("js", javascript);
lowlight.register("typescript", typescript);
lowlight.register("ts", typescript);
lowlight.register("bash", bash);
lowlight.register("sh", bash);
lowlight.register("json", json);
lowlight.register("yaml", yaml);
lowlight.register("yml", yaml);
lowlight.register("sql", sql);
lowlight.register("python", python);
lowlight.register("py", python);
lowlight.register("css", css);
lowlight.register("html", xml);
lowlight.register("xml", xml);
lowlight.register("markdown", markdown);
lowlight.register("md", markdown);

const CODE_LANGUAGES: Array<{ id: string; label: string }> = [
  { id: "plaintext", label: "Plain text" },
  { id: "bash", label: "Bash" },
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
  { id: "javascript", label: "JavaScript" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "typescript", label: "TypeScript" },
  { id: "xml", label: "XML" },
  { id: "yaml", label: "YAML" },
];

const CodeBlockWithControls = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

// Keep the editor's selection intact when a header button is clicked.
const preventBlur = (e: React.MouseEvent) => e.preventDefault();

interface Props {
  content: string;
  onUpdate: (html: string) => void;
  editable?: boolean;
  autoFocus?: boolean;
  onClickWhenReadOnly?: () => void;
  placeholder?: string;
}

export default function RichEditor({
  content,
  onUpdate,
  editable = true,
  autoFocus = false,
  onClickWhenReadOnly,
  placeholder = "Start writing your note...  Markdown shortcuts work: # H1, ## H2, - list, [ ] task, ``` code",
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      Placeholder.configure({ placeholder, emptyEditorClass: "is-empty" }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockWithControls.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          "prose-editor focus:outline-none min-h-[44vh] px-3 py-3 md:py-4 text-[14px] leading-[1.6] text-slate-800 dark:text-slate-100",
      },
    },
    onUpdate({ editor }) {
      onUpdate(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
    if (editable && autoFocus) {
      requestAnimationFrame(() => editor.commands.focus("end"));
    }
  }, [editor, editable, autoFocus]);

  if (!editor) return null;

  return (
    <div className="flex h-full min-h-[44vh] flex-col bg-white dark:bg-slate-900/40">
      {editable && <Toolbar editor={editor} />}
      <div
        className={`flex-1 overflow-y-auto ${
          !editable && onClickWhenReadOnly ? "cursor-text" : ""
        }`}
        onClick={!editable ? onClickWhenReadOnly : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      {editable && <StatusBar editor={editor} />}
    </div>
  );
}

/* ----------------------------- Toolbar ------------------------------ */

function Toolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  function openLinkEditor() {
    const previous = (editor.getAttributes("link").href as string) ?? "";
    setLinkValue(previous);
    setLinkOpen((v) => !v);
  }

  function applyLink() {
    const url = linkValue.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    }
    setLinkOpen(false);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        if (!editor.isFocused) return;
        e.preventDefault();
        openLinkEditor();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const isInTable = editor.isActive("table");

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center gap-1 px-1.5 py-1">
        <HeadingDropdown editor={editor} />

        <Segment>
          <TButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
            shortcut="⌘B"
          >
            <IconBold size={15} />
          </TButton>
          <TButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
            shortcut="⌘I"
          >
            <IconItalic size={15} />
          </TButton>
          <TButton
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            shortcut="⌘⇧S"
          >
            <IconStrikethrough size={15} />
          </TButton>
          <TButton
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
            shortcut="⌘E"
          >
            <IconCodeInline size={15} />
          </TButton>
        </Segment>

        <Segment>
          <TButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            shortcut="⌘⇧8"
          >
            <IconListBullet size={15} />
          </TButton>
          <TButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
            shortcut="⌘⇧7"
          >
            <IconListOrdered size={15} />
          </TButton>
          <TButton
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task list"
            shortcut="⌘⇧9"
          >
            <IconListCheck size={15} />
          </TButton>
        </Segment>

        <Segment>
          <TButton
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            <IconQuote size={15} />
          </TButton>
          <TButton
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            <IconCodeBlock size={15} />
          </TButton>
          <TButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
            <IconMinus size={15} />
          </TButton>
        </Segment>

        <Segment>
          <TButton
            active={editor.isActive("link") || linkOpen}
            onClick={openLinkEditor}
            title="Link"
            shortcut="⌘K"
          >
            <IconLink size={15} />
          </TButton>
          {isInTable ? (
            <TableDropdown editor={editor} />
          ) : (
            <TButton
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              title="Insert table"
            >
              <IconTable size={15} />
            </TButton>
          )}
        </Segment>

        <span className="ml-auto" />

        <Segment>
          <TButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
            shortcut="⌘Z"
            disabled={!editor.can().undo()}
          >
            <IconUndo size={15} />
          </TButton>
          <TButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
            shortcut="⌘⇧Z"
            disabled={!editor.can().redo()}
          >
            <IconRedo size={15} />
          </TButton>
        </Segment>
      </div>

      {linkOpen && (
        <LinkEditor
          value={linkValue}
          onChange={setLinkValue}
          onApply={applyLink}
          onRemove={removeLink}
          onClose={() => setLinkOpen(false)}
          hasExisting={editor.isActive("link")}
        />
      )}
    </div>
  );
}

/* --------------------------- Link Editor --------------------------- */

function LinkEditor({
  value,
  onChange,
  onApply,
  onRemove,
  onClose,
  hasExisting,
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
  onClose: () => void;
  hasExisting: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function openExternal() {
    const url = value.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/70 bg-slate-50/80 px-2.5 py-2 dark:border-slate-800/70 dark:bg-slate-900/60">
      <div className="grid h-7 w-7 place-items-center text-slate-500 dark:text-slate-400">
        <IconLink size={14} />
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onApply();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="Paste or type a URL (https://...)"
        className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {value.trim() && (
        <button
          type="button"
          onClick={openExternal}
          title="Open in new tab"
          className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100"
        >
          <IconExternal size={14} />
        </button>
      )}
      {hasExisting && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove link"
          className="grid h-7 w-7 place-items-center rounded-md text-rose-500 transition hover:bg-rose-100/70 dark:hover:bg-rose-900/30"
        >
          <IconUnlink size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        title="Cancel"
        className="grid h-7 w-7 place-items-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80"
      >
        <IconX size={14} />
      </button>
      <button
        type="button"
        onClick={onApply}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-brand-600 px-2.5 text-xs font-medium text-white transition hover:bg-brand-500"
      >
        <IconCheck size={13} /> Apply
      </button>
    </div>
  );
}

/* ------------------------- Heading dropdown ------------------------ */

const HEADING_OPTIONS = [
  { id: "p", label: "Paragraph", hint: "Body text", icon: IconType },
  { id: "h1", label: "Heading 1", hint: "Large title", icon: IconHeading1 },
  { id: "h2", label: "Heading 2", hint: "Section", icon: IconHeading2 },
  { id: "h3", label: "Heading 3", hint: "Subsection", icon: IconHeading3 },
] as const;

function HeadingDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentId = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";
  const current = HEADING_OPTIONS.find((o) => o.id === currentId)!;
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function apply(id: string) {
    const chain = editor.chain().focus();
    if (id === "p") chain.setParagraph().run();
    else if (id === "h1") chain.toggleHeading({ level: 1 }).run();
    else if (id === "h2") chain.toggleHeading({ level: 2 }).run();
    else if (id === "h3") chain.toggleHeading({ level: 3 }).run();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Text style"
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium transition ${
          open
            ? "border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            : "text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/70"
        }`}
      >
        <Icon size={14} />
        <span>{current.label}</span>
        <IconChevronDown size={12} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/[0.02] dark:border-slate-700/80 dark:bg-slate-900 dark:ring-white/[0.04]">
          <ul className="py-1">
            {HEADING_OPTIONS.map((opt) => {
              const OptIcon = opt.icon;
              const active = opt.id === currentId;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => apply(opt.id)}
                    className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition ${
                      active
                        ? "bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-100"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <OptIcon size={14} />
                    </span>
                    <span className="flex flex-col">
                      <span
                        className={`text-[13px] font-medium leading-tight ${
                          opt.id === "h1" ? "text-[15px]" : opt.id === "h2" ? "text-[14px]" : ""
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {opt.hint}
                      </span>
                    </span>
                    {active && (
                      <span className="ml-auto text-brand-600 dark:text-brand-300">
                        <IconCheck size={14} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------- Table dropdown ------------------------- */

function TableDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [
    {
      label: "Add row above",
      onClick: () => editor.chain().focus().addRowBefore().run(),
    },
    {
      label: "Add row below",
      onClick: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      label: "Add column left",
      onClick: () => editor.chain().focus().addColumnBefore().run(),
    },
    {
      label: "Add column right",
      onClick: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      label: "Delete row",
      onClick: () => editor.chain().focus().deleteRow().run(),
    },
    {
      label: "Delete column",
      onClick: () => editor.chain().focus().deleteColumn().run(),
    },
    {
      label: "Delete table",
      onClick: () => editor.chain().focus().deleteTable().run(),
      danger: true,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Table options"
        className={`grid h-8 min-w-[34px] place-items-center rounded-md px-1.5 text-slate-600 transition hover:bg-white hover:text-brand-700 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-brand-200 ${
          open ? "bg-white text-brand-700 shadow-sm dark:bg-slate-700/80 dark:text-brand-200" : ""
        }`}
      >
        <span className="flex items-center gap-1">
          <IconTable size={15} />
          <IconChevronDown size={10} className="opacity-60" />
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700/80 dark:bg-slate-900">
          <ul className="py-1">
            {items.map((it) => (
              <li key={it.label}>
                <button
                  type="button"
                  onClick={() => {
                    it.onClick();
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition ${
                    it.danger
                      ? "text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70"
                  }`}
                >
                  {it.danger && <IconTrash size={13} />}
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Status bar ---------------------------- */

function StatusBar({ editor }: { editor: Editor }) {
  const [, force] = useState(0);
  useEffect(() => {
    const handler = () => force((n) => n + 1);
    editor.on("update", handler);
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("update", handler);
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  const text = editor.getText();
  const words = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [text]);
  const chars = text.length;

  const sel = editor.state.selection;
  const selectionLen = sel.empty ? 0 : sel.to - sel.from;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/40 dark:text-slate-400">
      <div className="flex items-center gap-3">
        <span>
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {words.toLocaleString()}
          </strong>{" "}
          words
        </span>
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <span>
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {chars.toLocaleString()}
          </strong>{" "}
          characters
        </span>
        {selectionLen > 0 && (
          <>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-brand-600 dark:text-brand-300">
              {selectionLen.toLocaleString()} selected
            </span>
          </>
        )}
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          ⌘K
        </kbd>
        <span>link</span>
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          ⌘↵
        </kbd>
        <span>save</span>
      </div>
    </div>
  );
}

/* --------------------- Generic toolbar primitives ------------------- */

function Segment({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100/70 p-0.5 dark:bg-slate-800/50">
      {children}
    </div>
  );
}

function TButton({
  active,
  onClick,
  title,
  shortcut,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  shortcut?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const tip = shortcut ? `${title}  (${shortcut})` : title;
  return (
    <button
      type="button"
      onClick={onClick}
      title={tip}
      aria-label={tip}
      disabled={disabled}
      className={`grid h-7 min-w-[30px] place-items-center rounded-md px-1.5 transition ${
        active
          ? "bg-white text-brand-700 shadow-sm dark:bg-slate-700/80 dark:text-brand-200"
          : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white"
      } ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

/* --------------------------- Code block view -------------------------- */

function CodeBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [canEdit, setCanEdit] = useState(editor.isEditable);
  const menuRef = useRef<HTMLDivElement>(null);

  const rawLang = (node.attrs.language as string | null | undefined) || "plaintext";
  const current = CODE_LANGUAGES.find((l) => l.id === rawLang) || {
    id: rawLang,
    label: rawLang,
  };

  useEffect(() => {
    // `update` is emitted by Tiptap on doc changes AND from setEditable.
    const sync = () => setCanEdit(editor.isEditable);
    editor.on("update", sync);
    return () => {
      editor.off("update", sync);
    };
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyCode(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const text = node.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function pickLanguage(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateAttributes({ language: id });
    setOpen(false);
  }

  return (
    <NodeViewWrapper
      className={`codeblock-shell group ${wrap ? "is-wrap" : ""}`}
      as="div"
    >
      <div className="codeblock-header" contentEditable={false}>
        <span className="codeblock-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={(e) => {
              e.stopPropagation();
              if (!canEdit) return;
              setOpen((v) => !v);
            }}
            disabled={!canEdit}
            title={canEdit ? "Change language" : `Language: ${current.label}`}
            className={`codeblock-btn codeblock-lang ${open ? "is-open" : ""} ${
              !canEdit ? "is-readonly" : ""
            }`}
          >
            <span className="codeblock-lang-dot" aria-hidden="true" />
            <span>{current.label}</span>
            {canEdit && <IconChevronDown size={10} className="codeblock-lang-chev" />}
          </button>
          {open && canEdit && (
            <div className="codeblock-menu" role="listbox">
              {CODE_LANGUAGES.map((opt) => {
                const active = opt.id === current.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseDown={preventBlur}
                    onClick={(e) => pickLanguage(opt.id, e)}
                    className={`codeblock-menu-item ${active ? "is-active" : ""}`}
                  >
                    <span className={`codeblock-lang-swatch swatch-${opt.id}`} aria-hidden="true" />
                    <span className="codeblock-menu-label">{opt.label}</span>
                    {active && <IconCheck size={12} className="codeblock-menu-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="codeblock-spacer" />

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={(e) => {
            e.stopPropagation();
            setWrap((v) => !v);
          }}
          title={wrap ? "Disable line wrap" : "Wrap long lines"}
          aria-label="Toggle line wrap"
          aria-pressed={wrap}
          className={`codeblock-btn codeblock-wrap ${wrap ? "is-on" : ""}`}
        >
          <IconWrap size={12} />
          <span>Wrap</span>
        </button>

        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={copyCode}
          title={copied ? "Copied to clipboard" : "Copy code"}
          aria-label="Copy code"
          className={`codeblock-btn codeblock-copy ${copied ? "is-copied" : ""}`}
        >
          <span className="codeblock-copy-icon" aria-hidden="true">
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          </span>
          <span className="codeblock-copy-label">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" className={`hljs language-${current.id}`} />
      </pre>
    </NodeViewWrapper>
  );
}
