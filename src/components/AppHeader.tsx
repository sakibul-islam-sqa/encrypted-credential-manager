import type { RefObject } from "react";
import SyncStatus, { type SyncState } from "./SyncStatus";
import TabButton from "./TabButton";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { IconGlobe, IconNote, IconShield } from "./Icon";
import type { AppView } from "../lib/views";

interface Props {
  view: AppView;
  onChangeView: (next: AppView) => void;
  credentialCount: number;
  urlCount: number;
  notesCount: number;
  syncState: SyncState;
  lastSyncedAt?: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onPickImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onExport: () => void | Promise<void>;
  onSignOut: () => void;
  onDeleteAll: () => void;
  onLock: () => void;
}

/**
 * Sticky app header: brand, tab nav, sync chip, user menu, theme toggle.
 * The tab nav appears inline on >=sm screens and stacks below on mobile.
 */
export default function AppHeader(props: Props) {
  const {
    view,
    onChangeView,
    credentialCount,
    urlCount,
    notesCount,
    syncState,
    lastSyncedAt,
    fileInputRef,
    onPickImportFile,
    onImport,
    onExport,
    onSignOut,
    onDeleteAll,
    onLock,
  } = props;

  const subtitle =
    view === "credentials"
      ? `${credentialCount} credential${credentialCount === 1 ? "" : "s"} - encrypted`
      : view === "urls"
        ? `${urlCount} URL${urlCount === 1 ? "" : "s"} - encrypted`
        : `${notesCount} note${notesCount === 1 ? "" : "s"} - encrypted`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950">
            <IconShield size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Credential Manager</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div>
          </div>
        </div>

        <Nav
          view={view}
          onChangeView={onChangeView}
          credentialCount={credentialCount}
          urlCount={urlCount}
          notesCount={notesCount}
          className="ml-3 hidden sm:flex"
        />

        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onPickImportFile}
          />
          <SyncStatus state={syncState} lastSyncedAt={lastSyncedAt} />
          <UserMenu
            onImport={onImport}
            onExport={onExport}
            onSignOut={onSignOut}
            onDeleteAll={onDeleteAll}
            onLock={onLock}
          />
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-2 sm:hidden sm:px-6">
        <Nav
          view={view}
          onChangeView={onChangeView}
          credentialCount={credentialCount}
          urlCount={urlCount}
          notesCount={notesCount}
        />
      </div>
    </header>
  );
}

function Nav({
  view,
  onChangeView,
  credentialCount,
  urlCount,
  notesCount,
  className,
}: {
  view: AppView;
  onChangeView: (next: AppView) => void;
  credentialCount: number;
  urlCount: number;
  notesCount: number;
  className?: string;
}) {
  return (
    <nav
      className={`flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/60 p-1 dark:border-slate-800/60 dark:bg-slate-900/50 ${
        className ?? ""
      }`}
    >
      <TabButton
        active={view === "credentials"}
        onClick={() => onChangeView("credentials")}
        icon={<IconShield size={14} />}
        label="Credentials"
        badge={credentialCount}
      />
      <TabButton
        active={view === "urls"}
        onClick={() => onChangeView("urls")}
        icon={<IconGlobe size={14} />}
        label="URLs"
        badge={urlCount}
      />
      <TabButton
        active={view === "notes"}
        onClick={() => onChangeView("notes")}
        icon={<IconNote size={14} />}
        label="Notes"
        badge={notesCount}
      />
    </nav>
  );
}
