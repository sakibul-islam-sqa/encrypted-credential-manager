import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import CredentialForm from "./components/CredentialForm";
import { ToastProvider, useToast } from "./components/Toast";
import { ThemeProvider } from "./components/Theme";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import SignInScreen from "./components/SignInScreen";
import MasterPasswordScreen from "./components/MasterPasswordScreen";
import UrlForm from "./components/UrlForm";
import AppHeader from "./components/AppHeader";
import CenteredSpinner from "./components/CenteredSpinner";
import TabRefreshOverlay from "./components/TabRefreshOverlay";
import CredentialsView from "./components/CredentialsView";
import ConfirmModal from "./components/ConfirmModal";
import DeleteAccountModal from "./components/DeleteAccountModal";
import ImportModal from "./components/ImportModal";
import EntityFormModal from "./components/EntityFormModal";
import ErrorBoundary from "./components/ErrorBoundary";
const NotesView = lazy(() => import("./components/NotesView"));
const UrlsView = lazy(() => import("./components/UrlsView"));
import { clearEncryptedCache, clearNotesCache, createEmptyVault } from "./lib/storage";
import { deleteAllNotesRemote, deleteCloudVault, deleteUserProfile } from "./lib/sync";
import { clearCachedKey } from "./lib/keyCache";
import { TAB_REFRESH_COPY, type AppView } from "./lib/views";
import { useSyncStatus } from "./hooks/useSyncStatus";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useConfirmDialog } from "./hooks/useConfirmDialog";
import { useVault } from "./hooks/useVault";
import { useNotes } from "./hooks/useNotes";
import { useTabRefresh } from "./hooks/useTabRefresh";
import { useCredentials } from "./hooks/useCredentials";
import { useUrls } from "./hooks/useUrls";
import { useBackup } from "./hooks/useBackup";

function Shell() {
  const auth = useAuth();
  const toast = useToast();
  const userUid = auth.user?.uid ?? null;

  const { syncState, lastSyncedAt, actions: sync } = useSyncStatus();
  useOnlineStatus(sync.setSyncState);

  const confirm = useConfirmDialog();
  const vault = useVault({ userUid, sync, toast });
  const notes = useNotes({ userUid, unlock: vault.unlock, sync, toast, confirm });
  const credentials = useCredentials({ persist: vault.persist, toast, confirm });
  const urls = useUrls({ persist: vault.persist, toast, confirm });
  const backup = useBackup({
    vault: vault.vault,
    unlock: vault.unlock,
    notes: notes.notes,
    notesLoaded: notes.notesLoaded,
    setNotes: notes.setNotes,
    persist: vault.persist,
    persistNote: notes.persistNote,
    toast,
  });

  const [view, setView] = useState<AppView>("credentials");
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const { reset: resetVault, setRemote, setMpMode, setMpError } = vault;
  const {
    reset: resetNotes,
    setNotes,
    setSelectedNoteId,
    notesViewRef,
    notesDirty,
    handleCreateNote,
  } = notes;

  const tabRefresh = useTabRefresh({
    enabled: !!(userUid && vault.unlock),
    sync,
    refreshVault: vault.refresh,
    refreshNotes: notes.refresh,
  });
  const { refreshFromRemote } = tabRefresh;

  const changeView = useCallback(
    (next: AppView) => {
      if (next === view) return;
      const finish = () => {
        setView(next);
        void refreshFromRemote(next);
      };
      if (view === "notes" && notesDirty && notesViewRef.current) {
        const allowed = notesViewRef.current.attemptNavigateAway(finish);
        if (!allowed) return;
      }
      finish();
    },
    [view, notesDirty, notesViewRef, refreshFromRemote]
  );

  const onCreateNote = useCallback(() => {
    handleCreateNote();
    setView("notes");
  }, [handleCreateNote]);

  /* ----------------------- Sign out / lock / wipe ----------------------- */

  const wipeVaultAndNotes = useCallback(async (uid: string): Promise<void> => {
    // Idempotent: each helper is a no-op when there's nothing to delete.
    await deleteCloudVault(uid);
    await deleteAllNotesRemote(uid);
    clearEncryptedCache(uid);
    clearNotesCache(uid);
    await clearCachedKey();
  }, []);

  const wipeUserDataForDelete = useCallback(async () => {
    if (!userUid) return;
    await wipeVaultAndNotes(userUid);
    await deleteUserProfile(userUid);
  }, [userUid, wipeVaultAndNotes]);

  const onAccountDeleted = useCallback(() => {
    // onAuthStateChanged will clear `auth.user` and trigger the sign-in view;
    // we still reset local component state explicitly so there is no flicker
    // of stale vault/notes between the delete and the auth listener firing.
    resetVault();
    resetNotes();
    setRemote(null);
    setMpMode("create");
    setDeleteAccountOpen(false);
    toast.show("Account deleted", "success");
  }, [resetVault, resetNotes, setRemote, setMpMode, toast]);

  function handleSignOut() {
    confirm.ask({
      title: "Sign out?",
      message:
        "You can sign back in any time. Your encrypted vault stays in Firestore and on this device. The remembered master password on this device will be cleared.",
      destructive: false,
      confirmLabel: "Sign out",
      action: async () => {
        resetVault();
        resetNotes();
        await clearCachedKey();
        await auth.signOut();
      },
    });
  }

  // "Clear all my data" (from the user menu while unlocked) and "Forgot
  // master password / Reset vault" (from the master-password screen) are the
  // same destructive operation: wipe the encrypted vault + all notes, keep
  // the Firebase account, and let the user start over with a new master
  // password. They share this single helper so the dialog copy and the
  // post-wipe state reset stay in lockstep.
  function askResetVault() {
    confirm.ask({
      title: "Reset vault?",
      message:
        "This permanently deletes your encrypted vault and all saved data. Your account stays - you can start fresh with a new master password. This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete & start over",
      action: async () => {
        if (!userUid) return;
        await toast.promise(wipeVaultAndNotes(userUid), {
          loading: "Resetting vault...",
          success: "Vault reset. Set a new master password.",
          error: "Failed to reset. Try again.",
        });
        resetVault();
        resetNotes();
        setRemote({ kind: "missing" });
        setMpMode("create");
        setMpError(null);
      },
    });
  }

  // "Clear all data (keep master password)" wipes every credential, URL, and
  // note but leaves the encrypted vault document - and therefore its salt -
  // in place. We overwrite the vault with empty contents re-encrypted under
  // the *existing* derived key, so the user stays unlocked and keeps the same
  // master password instead of being bounced to the "create" screen the way
  // askResetVault() does.
  function askClearDataKeepPassword() {
    confirm.ask({
      title: "Clear all data?",
      message:
        "This permanently deletes all saved credentials, URLs, and notes. Your master password stays the same and you remain unlocked. This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete all data",
      action: async () => {
        if (!userUid || !vault.unlock) return;
        await toast.promise(
          (async () => {
            await vault.persist(() => createEmptyVault());
            await deleteAllNotesRemote(userUid);
            clearNotesCache(userUid);
          })(),
          {
            loading: "Clearing data...",
            success: "All data cleared.",
            error: "Failed to clear data. Try again.",
          }
        );
        setNotes(new Map());
        setSelectedNoteId(null);
      },
    });
  }

  function handleDeleteAccount() {
    if (!userUid) return;
    setDeleteAccountOpen(true);
  }

  function lockNow() {
    resetVault();
    resetNotes();
    setMpMode("unlock");
    void clearCachedKey();
    toast.show("Vault locked. Re-enter master password to unlock.", "info");
  }

  /* --------------------------- Form helpers ---------------------------- */

  const knownUrlApps = useMemo(() => {
    const set = new Set<string>();
    vault.vault?.urls?.forEach((u) => set.add(u.app));
    vault.vault?.entries.forEach((e) => set.add(e.app));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vault.vault]);

  const knownUrlVariants = useMemo(() => {
    const set = new Set<string>();
    vault.vault?.urls?.forEach((u) => {
      if (u.variant) set.add(u.variant);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vault.vault]);

  const urlAppEnvs = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const u of vault.vault?.urls ?? []) {
      const app = u.app;
      if (!app) continue;
      if (!map[app]) map[app] = new Set();
      const env = String(u.environment).trim();
      if (env) map[app].add(env);
    }
    const out: Record<string, string[]> = {};
    for (const [app, envs] of Object.entries(map)) {
      out[app] = Array.from(envs);
    }
    return out;
  }, [vault.vault]);

  /* ----------------------------- Render -------------------------------- */

  if (auth.loading) {
    return <CenteredSpinner label="Loading..." />;
  }

  if (!auth.user) {
    return <SignInScreen />;
  }

  if (vault.bootstrapping) {
    return <CenteredSpinner label="Loading your vault..." />;
  }

  if (vault.bootError && !vault.remote) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-6 text-sm">
          <h2 className="mb-2 text-base font-semibold text-rose-600 dark:text-rose-300">
            Could not load vault
          </h2>
          <p className="mb-4 text-slate-600 dark:text-slate-300">{vault.bootError}</p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Retry
            </button>
            <button className="btn-ghost" onClick={() => void auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!vault.unlock || !vault.vault) {
    return (
      <>
        <MasterPasswordScreen
          mode={vault.mpMode}
          legacyCount={vault.remote?.kind === "legacy" ? vault.remote.doc.entries.length : 0}
          onSubmit={vault.handleMasterPassword}
          onForgotMasterPassword={askResetVault}
          busy={vault.mpBusy}
          error={vault.mpError}
        />
        <ConfirmModal
          state={confirm.state}
          pending={confirm.pending}
          onCancel={confirm.close}
          onConfirm={() => confirm.state.onConfirm?.()}
        />
      </>
    );
  }

  const activeVault = vault.vault;

  return (
    <div className="min-h-screen">
      <AppHeader
        view={view}
        onChangeView={changeView}
        credentialCount={activeVault.entries.length}
        urlCount={(activeVault.urls ?? []).length}
        notesCount={notes.notes.size}
        syncState={syncState}
        lastSyncedAt={lastSyncedAt}
        fileInputRef={backup.fileInputRef}
        onPickImportFile={backup.onPickImportFile}
        onImport={() => backup.fileInputRef.current?.click()}
        onExport={backup.exportEncrypted}
        onSignOut={handleSignOut}
        onClearData={askClearDataKeepPassword}
        onClearAllData={askResetVault}
        onDeleteAccount={handleDeleteAccount}
        onLock={lockNow}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <TabRefreshOverlay
          loading={tabRefresh.tabRefreshing}
          title={TAB_REFRESH_COPY[tabRefresh.tabRefreshTarget].title}
          subtitle={TAB_REFRESH_COPY[tabRefresh.tabRefreshTarget].subtitle}
        >
          {view === "notes" ? (
            <Suspense fallback={<CenteredSpinner label="Loading notes editor..." inline />}>
              <NotesView
                ref={notesViewRef}
                notes={notes.notesList}
                selectedId={notes.selectedNoteId}
                onSelect={notes.setSelectedNoteId}
                onCreate={onCreateNote}
                onUpdate={notes.handleUpdateNote}
                onDelete={notes.handleDeleteNote}
                onDirtyChange={notes.setNotesDirty}
              />
            </Suspense>
          ) : view === "urls" ? (
            <Suspense fallback={<CenteredSpinner label="Loading URLs..." inline />}>
              <UrlsView
                urls={activeVault.urls ?? []}
                onAdd={urls.openAdd}
                onEdit={urls.openEdit}
                onDelete={urls.askDelete}
              />
            </Suspense>
          ) : (
            <CredentialsView
              entries={activeVault.entries}
              onAdd={credentials.openAdd}
              onEdit={credentials.openEdit}
              onDelete={credentials.askDelete}
            />
          )}
        </TabRefreshOverlay>

        <footer className="mt-12 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500 dark:border-slate-800/60 dark:text-slate-500">
          End-to-end encrypted with AES-256-GCM. Master password never leaves this browser.
        </footer>
      </main>

      <EntityFormModal
        open={credentials.modalOpen}
        isEdit={!!credentials.editing}
        saving={credentials.saving}
        entityLabel="credential"
        formId="credential-form"
        onClose={credentials.close}
      >
        <CredentialForm
          initial={credentials.editing ?? undefined}
          urlAppEnvs={urlAppEnvs}
          onSubmit={credentials.handleSaveEntry}
        />
      </EntityFormModal>

      <EntityFormModal
        open={urls.modalOpen}
        isEdit={!!urls.editing}
        saving={urls.saving}
        entityLabel="URL"
        formId="url-form"
        onClose={urls.close}
      >
        <UrlForm
          initial={urls.editing ?? undefined}
          knownApps={knownUrlApps}
          knownVariants={knownUrlVariants}
          onSubmit={urls.handleSaveUrl}
        />
      </EntityFormModal>

      <ImportModal
        open={backup.importOpen}
        text={backup.importText}
        password={backup.importPassword}
        passwordVisible={backup.importPasswordVisible}
        error={backup.importError}
        onChangeText={backup.setImportText}
        onChangePassword={backup.setImportPassword}
        onTogglePasswordVisible={backup.togglePasswordVisible}
        onClose={backup.closeImport}
        onImport={backup.performImport}
      />

      <ConfirmModal
        state={confirm.state}
        pending={confirm.pending}
        onCancel={confirm.close}
        onConfirm={() => confirm.state.onConfirm?.()}
      />

      <DeleteAccountModal
        open={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        wipeUserData={wipeUserDataForDelete}
        onDeleted={onAccountDeleted}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
