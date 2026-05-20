import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "./components/Modal";
import CredentialForm from "./components/CredentialForm";
import { ToastProvider, useToast } from "./components/Toast";
import { ThemeProvider } from "./components/Theme";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import SignInScreen from "./components/SignInScreen";
import MasterPasswordScreen, { type MasterPasswordMode } from "./components/MasterPasswordScreen";
import { type SyncState } from "./components/SyncStatus";
import UrlForm from "./components/UrlForm";
import AppHeader from "./components/AppHeader";
import CenteredSpinner from "./components/CenteredSpinner";
import CredentialsView from "./components/CredentialsView";
import ConfirmModal, { type ConfirmState } from "./components/ConfirmModal";
import ImportModal from "./components/ImportModal";
import ErrorBoundary from "./components/ErrorBoundary";
import type { NotesViewHandle } from "./components/NotesView";
const NotesView = lazy(() => import("./components/NotesView"));
const UrlsView = lazy(() => import("./components/UrlsView"));
import type { CredentialEntry, NoteEntry, UrlEntry, Vault } from "./types";
import {
  clearEncryptedCache,
  clearNotesCache,
  createEmptyVault,
  patchNotesCache,
  readEncryptedCache,
  readNotesCache,
  writeEncryptedCache,
  writeNotesCache,
  type NotesCache,
} from "./lib/storage";
import {
  deleteAllNotesRemote,
  deleteCloudVault,
  deleteNoteRemote,
  pullAllNotes,
  pullRemoteVault,
  pushEncryptedVault,
  pushNote,
  type EncryptedNoteDoc,
  type EncryptedVaultDoc,
  type RemoteVault,
} from "./lib/sync";
import { decryptJson, deriveKey, encryptJson, generateSalt } from "./lib/cryptoZK";
import {
  clearCachedKey,
  durationToMs,
  readCachedKey,
  writeCachedKey,
  type RememberDuration,
} from "./lib/keyCache";
import {
  buildBackupEnvelope,
  downloadBackup,
  getEnvelopeVersion,
  isEncryptedBackupBlob,
  isFullBackup,
  isVault,
  mergeById,
  type FullBackup,
} from "./lib/backup";
import { uid as makeId } from "./lib/id";
import { IconCheck, IconPlus, IconSpinner, IconX } from "./components/Icon";
import type { AppView } from "./lib/views";

interface UnlockKey {
  key: CryptoKey;
  salt: string;
}

function Shell() {
  const auth = useAuth();
  const toast = useToast();

  const userUid = auth.user?.uid ?? null;

  const [vault, setVault] = useState<Vault | null>(null);
  const [remote, setRemote] = useState<RemoteVault | null>(null);
  const [unlock, setUnlock] = useState<UnlockKey | null>(null);
  const [mpMode, setMpMode] = useState<MasterPasswordMode>("unlock");
  const [mpBusy, setMpBusy] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialEntry | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importPasswordVisible, setImportPasswordVisible] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [confirmPending, setConfirmPending] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>(undefined);

  const [view, setView] = useState<AppView>("credentials");
  const [notes, setNotes] = useState<Map<string, NoteEntry>>(new Map());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const notesViewRef = useRef<NotesViewHandle>(null);

  const changeView = useCallback(
    (next: AppView) => {
      if (next === view) return;
      if (view === "notes" && notesDirty && notesViewRef.current) {
        const allowed = notesViewRef.current.attemptNavigateAway(() => setView(next));
        if (!allowed) return;
      }
      setView(next);
    },
    [view, notesDirty]
  );

  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<UrlEntry | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUidRef = useRef<string | null>(null);

  /* --------------------- Bootstrap & unlock pipeline --------------------- */

  useEffect(() => {
    if (!userUid) {
      lastUidRef.current = null;
      setVault(null);
      setRemote(null);
      setUnlock(null);
      setNotes(new Map());
      setSelectedNoteId(null);
      setNotesLoaded(false);
      setBootstrapping(false);
      return;
    }
    if (lastUidRef.current === userUid) return;
    lastUidRef.current = userUid;

    let cancelled = false;
    let unlockedViaCache = false;
    setBootstrapping(true);
    setBootError(null);
    setVault(null);
    setUnlock(null);

    void (async () => {
      const cachedBlob = readEncryptedCache(userUid);

      if (cachedBlob) {
        setRemote({ kind: "encrypted", doc: cachedBlob });
        setMpMode("unlock");
        unlockedViaCache = await tryCachedUnlock(userUid, cachedBlob);
      }

      if (!cancelled) setBootstrapping(false);

      try {
        const r = await pullRemoteVault(userUid);
        if (cancelled) return;
        setRemote(r);
        if (r.kind === "encrypted") {
          writeEncryptedCache(userUid, r.doc);
          if (!unlockedViaCache) {
            setMpMode("unlock");
            await tryCachedUnlock(userUid, r.doc);
          }
        } else if (r.kind === "legacy") {
          setMpMode("migrate");
          await clearCachedKey();
        } else if (!unlockedViaCache) {
          setMpMode("create");
          await clearCachedKey();
        }
      } catch {
        if (!cancelled && !cachedBlob) {
          setBootError("Could not load your vault. Check your connection and try again.");
          setSyncState(navigator.onLine ? "error" : "offline");
        } else if (!cancelled) {
          setSyncState(navigator.onLine ? "error" : "offline");
        }
      }
    })();

    async function tryCachedUnlock(uid: string, doc: EncryptedVaultDoc): Promise<boolean> {
      const cachedKey = await readCachedKey(uid);
      if (!cachedKey) return false;
      if (cachedKey.salt !== doc.salt) {
        await clearCachedKey();
        return false;
      }
      try {
        const plain = await decryptJson<Vault>(cachedKey.key, {
          ciphertext: doc.ciphertext,
          iv: doc.iv,
        });
        if (!plain || plain.version !== 1 || !Array.isArray(plain.entries)) {
          await clearCachedKey();
          return false;
        }
        if (cancelled) return false;
        setUnlock({ key: cachedKey.key, salt: cachedKey.salt });
        setVault(plain);
        setLastSyncedAt(Date.now());
        setSyncState("synced");
        return true;
      } catch {
        await clearCachedKey();
        return false;
      }
    }

    return () => {
      cancelled = true;
    };
  }, [userUid]);

  useEffect(() => {
    function onOnline() {
      setSyncState((s) => (s === "offline" ? "idle" : s));
    }
    function onOffline() {
      setSyncState("offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (!navigator.onLine) setSyncState("offline");
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!userUid || !unlock || notesLoaded) return;
    let cancelled = false;

    void (async () => {
      const cached = readNotesCache(userUid);
      if (cached) {
        const decoded = await decodeNotesCache(cached, unlock.key);
        if (!cancelled && decoded.size > 0) {
          setNotes(decoded);
          setNotesLoaded(true);
        }
      }

      try {
        const remoteNotes = await pullAllNotes(userUid);
        if (cancelled) return;
        const nextCache: NotesCache = {};
        const nextNotes = new Map<string, NoteEntry>();
        for (const { id, doc } of remoteNotes) {
          nextCache[id] = doc;
          try {
            const note = await decryptJson<NoteEntry>(unlock.key, {
              ciphertext: doc.ciphertext,
              iv: doc.iv,
            });
            if (note?.id) nextNotes.set(note.id, note);
          } catch {
            // skip un-decryptable note (likely from a different master password)
          }
        }
        if (cancelled) return;
        writeNotesCache(userUid, nextCache);
        setNotes(nextNotes);
        setNotesLoaded(true);
      } catch {
        if (!cancelled) setNotesLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userUid, unlock, notesLoaded]);

  const handleMasterPassword = useCallback(
    async (pw: string, remember: RememberDuration) => {
      if (!userUid || !remote) return;
      setMpBusy(true);
      setMpError(null);
      try {
        let resolvedKey: CryptoKey | null = null;
        let resolvedSalt: string | null = null;

        if (remote.kind === "encrypted") {
          const key = await deriveKey(pw, remote.doc.salt);
          let plain: Vault;
          try {
            plain = await decryptJson<Vault>(key, {
              ciphertext: remote.doc.ciphertext,
              iv: remote.doc.iv,
            });
          } catch {
            throw new Error("Wrong master password.");
          }
          if (!plain || plain.version !== 1 || !Array.isArray(plain.entries)) {
            throw new Error("Decrypted data is unreadable.");
          }
          setUnlock({ key, salt: remote.doc.salt });
          setVault(plain);
          setLastSyncedAt(Date.now());
          setSyncState("synced");
          resolvedKey = key;
          resolvedSalt = remote.doc.salt;
        } else if (remote.kind === "missing") {
          const salt = generateSalt();
          const key = await deriveKey(pw, salt);
          const empty = createEmptyVault();
          const payload = await encryptJson(key, salt, empty);
          const doc: EncryptedVaultDoc = {
            ciphertext: payload.ciphertext,
            iv: payload.iv,
            salt,
            updatedAt: empty.updatedAt,
            schemaVersion: 2,
          };
          await pushEncryptedVault(userUid, doc);
          writeEncryptedCache(userUid, doc);
          setRemote({ kind: "encrypted", doc });
          setUnlock({ key, salt });
          setVault(empty);
          setLastSyncedAt(Date.now());
          setSyncState("synced");
          resolvedKey = key;
          resolvedSalt = salt;
        } else if (remote.kind === "legacy") {
          const salt = generateSalt();
          const key = await deriveKey(pw, salt);
          const migrated: Vault = {
            version: 1,
            entries: remote.doc.entries,
            urls: [],
            updatedAt: Date.now(),
          };
          const payload = await encryptJson(key, salt, migrated);
          const doc: EncryptedVaultDoc = {
            ciphertext: payload.ciphertext,
            iv: payload.iv,
            salt,
            updatedAt: migrated.updatedAt,
            schemaVersion: 2,
          };
          await pushEncryptedVault(userUid, doc);
          writeEncryptedCache(userUid, doc);
          setRemote({ kind: "encrypted", doc });
          setUnlock({ key, salt });
          setVault(migrated);
          setLastSyncedAt(Date.now());
          setSyncState("synced");
          toast.show("Existing data encrypted with your master password", "success");
          resolvedKey = key;
          resolvedSalt = salt;
        }

        if (resolvedKey && resolvedSalt) {
          if (remember === "never") {
            await clearCachedKey();
          } else {
            await writeCachedKey({
              uid: userUid,
              key: resolvedKey,
              salt: resolvedSalt,
              expiresAt: Date.now() + durationToMs(remember),
            });
          }
        }
      } catch (e) {
        setMpError(e instanceof Error ? e.message : "Failed.");
      } finally {
        setMpBusy(false);
      }
    },
    [userUid, remote, toast]
  );

  /* --------------------------- Persist helpers --------------------------- */

  const persist = useCallback(
    async (updater: (v: Vault) => Vault): Promise<void> => {
      if (!userUid || !vault || !unlock) return;
      const next: Vault = { ...updater(vault), updatedAt: Date.now() };
      setVault(next);
      setSyncState("syncing");
      try {
        const payload = await encryptJson(unlock.key, unlock.salt, next);
        const doc: EncryptedVaultDoc = {
          ciphertext: payload.ciphertext,
          iv: payload.iv,
          salt: unlock.salt,
          updatedAt: next.updatedAt,
          schemaVersion: 2,
        };
        writeEncryptedCache(userUid, doc);
        await pushEncryptedVault(userUid, doc);
        setRemote({ kind: "encrypted", doc });
        setLastSyncedAt(Date.now());
        setSyncState("synced");
      } catch (e) {
        setSyncState(navigator.onLine ? "error" : "offline");
        throw e;
      }
    },
    [userUid, vault, unlock]
  );

  const persistNote = useCallback(
    async (note: NoteEntry): Promise<void> => {
      if (!userUid || !unlock) return;
      setSyncState("syncing");
      try {
        const payload = await encryptJson(unlock.key, unlock.salt, note);
        const doc: EncryptedNoteDoc = {
          ciphertext: payload.ciphertext,
          iv: payload.iv,
          updatedAt: note.updatedAt,
          schemaVersion: 1,
        };
        patchNotesCache(userUid, note.id, doc);
        await pushNote(userUid, note.id, doc);
        setLastSyncedAt(Date.now());
        setSyncState("synced");
      } catch (e) {
        setSyncState(navigator.onLine ? "error" : "offline");
        throw e;
      }
    },
    [userUid, unlock]
  );

  /* ------------------------------- Notes -------------------------------- */

  const handleCreateNote = useCallback(() => {
    if (!userUid || !unlock) return;
    const now = Date.now();
    const note: NoteEntry = {
      id: makeId(),
      title: "Untitled",
      body: "",
      tags: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => {
      const next = new Map(prev);
      next.set(note.id, note);
      return next;
    });
    setSelectedNoteId(note.id);
    setView("notes");
    // Persist quietly - new empty notes shouldn't toast. Failures still surface
    // via the sync indicator and the user's next save attempt.
    void persistNote(note).catch(() => undefined);
  }, [userUid, unlock, persistNote]);

  const handleUpdateNote = useCallback(
    async (id: string, patch: Partial<NoteEntry>): Promise<void> => {
      const current = notes.get(id);
      if (!current) throw new Error("Note not found");
      const updated: NoteEntry = {
        ...current,
        ...patch,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: Date.now(),
      };
      setNotes((prev) => {
        const next = new Map(prev);
        next.set(id, updated);
        return next;
      });
      await toast.promise(persistNote(updated), {
        loading: "Saving note...",
        success: "Note saved",
        error: "Couldn't save note. Check your connection.",
      });
    },
    [notes, persistNote, toast]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      const note = notes.get(id);
      if (!note) return;
      setConfirm({
        open: true,
        title: "Delete note?",
        message: `"${note.title || "Untitled"}" will be permanently deleted. This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
        onConfirm: async () => {
          if (!userUid) return;
          setConfirmPending(true);
          try {
            await toast.promise(deleteNoteRemote(userUid, id), {
              loading: "Deleting note...",
              success: "Note deleted",
              error: "Couldn't delete note. Try again.",
            });
            setNotes((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
            if (selectedNoteId === id) setSelectedNoteId(null);
            patchNotesCache(userUid, id, null);
            setConfirm({ open: false });
          } catch {
            // toast already showed the error; keep the confirm open so the user can retry
          } finally {
            setConfirmPending(false);
          }
        },
      });
    },
    [notes, selectedNoteId, userUid, toast]
  );

  /* ---------------------------- Credentials ----------------------------- */

  async function handleSaveEntry(data: Omit<CredentialEntry, "id" | "createdAt" | "updatedAt">) {
    const now = Date.now();
    const isEdit = !!editing;
    const editingId = editing?.id;
    setSavingEntry(true);
    try {
      await toast.promise(
        persist((v) =>
          isEdit
            ? {
                ...v,
                entries: v.entries.map((e) =>
                  e.id === editingId ? { ...editing!, ...data, updatedAt: now } : e
                ),
              }
            : {
                ...v,
                entries: [{ id: makeId(), createdAt: now, updatedAt: now, ...data }, ...v.entries],
              }
        ),
        {
          loading: isEdit ? "Saving changes..." : "Adding credential...",
          success: isEdit ? "Credential updated" : "Credential added",
          error: "Couldn't save. Check your connection.",
        }
      );
      setEditing(null);
      setModalOpen(false);
    } catch {
      // toast already showed the error; keep the modal open so user can retry
    } finally {
      setSavingEntry(false);
    }
  }

  function askDelete(entry: CredentialEntry) {
    setConfirm({
      open: true,
      title: "Delete credential?",
      message: `This will permanently remove "${entry.app}" (${entry.environment}). This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmPending(true);
        try {
          await toast.promise(
            persist((v) => ({
              ...v,
              entries: v.entries.filter((e) => e.id !== entry.id),
            })),
            {
              loading: "Deleting credential...",
              success: "Credential deleted",
              error: "Couldn't delete. Try again.",
            }
          );
          setConfirm({ open: false });
        } catch {
          // keep dialog open for retry
        } finally {
          setConfirmPending(false);
        }
      },
    });
  }

  /* -------------------------------- URLs -------------------------------- */

  async function handleSaveUrl(data: Omit<UrlEntry, "id" | "createdAt" | "updatedAt">) {
    const now = Date.now();
    const isEdit = !!editingUrl;
    const editingId = editingUrl?.id;
    setSavingUrl(true);
    try {
      await toast.promise(
        persist((v) => {
          const current = v.urls ?? [];
          return isEdit
            ? {
                ...v,
                urls: current.map((u) =>
                  u.id === editingId ? { ...editingUrl!, ...data, updatedAt: now } : u
                ),
              }
            : {
                ...v,
                urls: [{ id: makeId(), createdAt: now, updatedAt: now, ...data }, ...current],
              };
        }),
        {
          loading: isEdit ? "Saving URL..." : "Adding URL...",
          success: isEdit ? "URL updated" : "URL added",
          error: "Couldn't save. Check your connection.",
        }
      );
      setEditingUrl(null);
      setUrlModalOpen(false);
    } catch {
      // keep modal open
    } finally {
      setSavingUrl(false);
    }
  }

  function askDeleteUrl(entry: UrlEntry) {
    setConfirm({
      open: true,
      title: "Delete URL?",
      message: `This will permanently remove the ${entry.environment}${
        entry.variant ? ` / ${entry.variant}` : ""
      } URL for "${entry.app}". This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmPending(true);
        try {
          await toast.promise(
            persist((v) => ({
              ...v,
              urls: (v.urls ?? []).filter((u) => u.id !== entry.id),
            })),
            {
              loading: "Deleting URL...",
              success: "URL deleted",
              error: "Couldn't delete. Try again.",
            }
          );
          setConfirm({ open: false });
        } catch {
          // keep dialog open
        } finally {
          setConfirmPending(false);
        }
      },
    });
  }

  /* --------------------------- Backup / restore ------------------------- */

  async function exportEncrypted() {
    if (!vault || !unlock) return;
    if (!notesLoaded) {
      toast.show("Notes are still loading. Try exporting again in a moment.", "info");
      return;
    }
    const backup: FullBackup = {
      version: 1,
      vault,
      notes: Array.from(notes.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    };
    try {
      const encrypted = await encryptJson(unlock.key, unlock.salt, backup);
      const envelope = buildBackupEnvelope({
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: unlock.salt,
      });
      downloadBackup(envelope);
      toast.show("Encrypted full backup downloaded", "success");
    } catch {
      toast.show("Couldn't prepare encrypted export. Try again.", "error");
    }
  }

  function onPickImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result ?? ""));
      setImportPassword("");
      setImportPasswordVisible(false);
      setImportError(null);
      setImportOpen(true);
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function closeImport() {
    setImportOpen(false);
    setImportText("");
    setImportPassword("");
    setImportPasswordVisible(false);
    setImportError(null);
  }

  async function performImport() {
    setImportError(null);
    if (!vault || !unlock) {
      setImportError("Vault not loaded.");
      return;
    }
    if (!notesLoaded) {
      setImportError("Notes are still loading. Try importing again in a moment.");
      return;
    }
    let parsedEnvelope: unknown;
    try {
      parsedEnvelope = JSON.parse(importText);
    } catch {
      setImportError("File is not valid JSON.");
      return;
    }
    const envelope =
      parsedEnvelope && typeof parsedEnvelope === "object"
        ? (parsedEnvelope as Record<string, unknown>)
        : null;
    const blob = envelope?.blob;
    if (!isEncryptedBackupBlob(blob)) {
      setImportError("File doesn't look like a Credential Manager export.");
      return;
    }
    if (!importPassword) {
      setImportError("Enter the master password used when this file was exported.");
      return;
    }
    try {
      const fileKey = await deriveKey(importPassword, blob.salt);
      const decrypted = await decryptJson<unknown>(fileKey, {
        ciphertext: blob.ciphertext,
        iv: blob.iv,
      });
      const exportVersion = getEnvelopeVersion(envelope);

      let importedVault: Vault;
      let importedNotes: NoteEntry[] = [];
      if (exportVersion >= 3) {
        if (!isFullBackup(decrypted)) {
          throw new Error("File contents are not a valid full backup.");
        }
        importedVault = decrypted.vault;
        importedNotes = decrypted.notes;
      } else {
        if (!isVault(decrypted)) {
          throw new Error("File contents are not a valid vault.");
        }
        importedVault = decrypted;
      }

      const entries = mergeById(vault.entries, importedVault.entries);
      const urls = mergeById(vault.urls ?? [], importedVault.urls ?? []);
      const noteMerge = mergeById(Array.from(notes.values()), importedNotes);

      const vaultChangeCount =
        entries.stats.added + entries.stats.updated + urls.stats.added + urls.stats.updated;
      const noteChangeCount = noteMerge.stats.added + noteMerge.stats.updated;

      if (vaultChangeCount > 0) {
        await persist((v) => ({
          ...v,
          entries: entries.items,
          urls: urls.items,
        }));
      }
      if (noteChangeCount > 0) {
        const incomingIds = new Set<string>();
        for (const n of importedNotes) incomingIds.add(n.id);
        for (const note of noteMerge.items) {
          if (incomingIds.has(note.id)) {
            await persistNote(note);
          }
        }
        setNotes(new Map(noteMerge.items.map((n) => [n.id, n])));
      }

      closeImport();
      if (vaultChangeCount + noteChangeCount === 0) {
        toast.show("This backup was already imported. No changes were made.", "info");
        return;
      }
      const urlSummary =
        urls.stats.added + urls.stats.updated > 0
          ? `, URLs: +${urls.stats.added} new, ${urls.stats.updated} updated`
          : "";
      const noteSummary =
        importedNotes.length > 0
          ? `, notes: +${noteMerge.stats.added} new, ${noteMerge.stats.updated} updated`
          : "";
      toast.show(
        `Import complete: credentials: +${entries.stats.added} new, ${entries.stats.updated} updated${urlSummary}${noteSummary}`,
        "success"
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  /* ----------------------- Sign out / lock / wipe ----------------------- */

  function handleSignOut() {
    setConfirm({
      open: true,
      title: "Sign out?",
      message:
        "You can sign back in any time. Your encrypted vault stays in Firestore and on this device. The remembered master password on this device will be cleared.",
      destructive: false,
      confirmLabel: "Sign out",
      onConfirm: async () => {
        setConfirmPending(true);
        try {
          setUnlock(null);
          setVault(null);
          setNotes(new Map());
          setSelectedNoteId(null);
          setNotesLoaded(false);
          await clearCachedKey();
          await auth.signOut();
          setConfirm({ open: false });
        } finally {
          setConfirmPending(false);
        }
      },
    });
  }

  function handleDeleteAll() {
    setConfirm({
      open: true,
      title: "Delete all credentials?",
      message:
        "This will permanently delete the encrypted vault from Firestore and this device. Your account stays. This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete everything",
      onConfirm: async () => {
        if (!userUid) return;
        setConfirmPending(true);
        try {
          await toast.promise(
            (async () => {
              await deleteCloudVault(userUid);
              await deleteAllNotesRemote(userUid);
              clearEncryptedCache(userUid);
              clearNotesCache(userUid);
              await clearCachedKey();
            })(),
            {
              loading: "Deleting everything...",
              success: "All data deleted",
              error: "Failed to delete. Try again.",
            }
          );
          setUnlock(null);
          setVault(null);
          setNotes(new Map());
          setSelectedNoteId(null);
          setNotesLoaded(false);
          setRemote({ kind: "missing" });
          setMpMode("create");
          setConfirm({ open: false });
        } catch {
          // toast handled the error
        } finally {
          setConfirmPending(false);
        }
      },
    });
  }

  function handleForgotMasterPassword() {
    setConfirm({
      open: true,
      title: "Reset vault?",
      message:
        "Without your master password, your saved credentials are unrecoverable. Resetting deletes them and lets you start over with a new master password.",
      destructive: true,
      confirmLabel: "Delete & start over",
      onConfirm: async () => {
        if (!userUid) return;
        setConfirmPending(true);
        try {
          await toast.promise(
            (async () => {
              await deleteCloudVault(userUid);
              await deleteAllNotesRemote(userUid);
              clearEncryptedCache(userUid);
              clearNotesCache(userUid);
              await clearCachedKey();
            })(),
            {
              loading: "Resetting vault...",
              success: "Vault reset. Set a new master password.",
              error: "Failed to reset. Try again.",
            }
          );
          setNotes(new Map());
          setSelectedNoteId(null);
          setNotesLoaded(false);
          setRemote({ kind: "missing" });
          setMpMode("create");
          setMpError(null);
          setConfirm({ open: false });
        } catch {
          // toast handled the error
        } finally {
          setConfirmPending(false);
        }
      },
    });
  }

  function lockNow() {
    setUnlock(null);
    setVault(null);
    setNotes(new Map());
    setSelectedNoteId(null);
    setNotesLoaded(false);
    setMpMode("unlock");
    void clearCachedKey();
    toast.show("Vault locked. Re-enter master password to unlock.", "info");
  }

  /* --------------------------- Form helpers ---------------------------- */

  const knownUrlApps = useMemo(() => {
    const set = new Set<string>();
    vault?.urls?.forEach((u) => set.add(u.app));
    vault?.entries.forEach((e) => set.add(e.app));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vault]);

  const knownUrlVariants = useMemo(() => {
    const set = new Set<string>();
    vault?.urls?.forEach((u) => {
      if (u.variant) set.add(u.variant);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vault]);

  const urlAppEnvs = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const u of vault?.urls ?? []) {
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
  }, [vault]);

  /* ----------------------------- Render -------------------------------- */

  if (auth.loading) {
    return <CenteredSpinner label="Loading..." />;
  }

  if (!auth.user) {
    return <SignInScreen />;
  }

  if (bootstrapping) {
    return <CenteredSpinner label="Loading your vault..." />;
  }

  if (bootError && !remote) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-6 text-sm">
          <h2 className="mb-2 text-base font-semibold text-rose-600 dark:text-rose-300">
            Could not load vault
          </h2>
          <p className="mb-4 text-slate-600 dark:text-slate-300">{bootError}</p>
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

  if (!unlock || !vault) {
    return (
      <MasterPasswordScreen
        mode={mpMode}
        legacyCount={remote?.kind === "legacy" ? remote.doc.entries.length : 0}
        onSubmit={handleMasterPassword}
        onForgotMasterPassword={handleForgotMasterPassword}
        busy={mpBusy}
        error={mpError}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        view={view}
        onChangeView={changeView}
        credentialCount={vault.entries.length}
        urlCount={(vault.urls ?? []).length}
        notesCount={notes.size}
        syncState={syncState}
        lastSyncedAt={lastSyncedAt}
        fileInputRef={fileInputRef}
        onPickImportFile={onPickImportFile}
        onImport={() => fileInputRef.current?.click()}
        onExport={exportEncrypted}
        onSignOut={handleSignOut}
        onDeleteAll={handleDeleteAll}
        onLock={lockNow}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {view === "notes" ? (
          <Suspense fallback={<CenteredSpinner label="Loading notes editor..." inline />}>
            <NotesView
              ref={notesViewRef}
              notes={Array.from(notes.values())}
              selectedId={selectedNoteId}
              onSelect={setSelectedNoteId}
              onCreate={handleCreateNote}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
              onDirtyChange={setNotesDirty}
            />
          </Suspense>
        ) : view === "urls" ? (
          <Suspense fallback={<CenteredSpinner label="Loading URLs..." inline />}>
            <UrlsView
              urls={vault.urls ?? []}
              onAdd={() => {
                setEditingUrl(null);
                setUrlModalOpen(true);
              }}
              onEdit={(entry) => {
                setEditingUrl(entry);
                setUrlModalOpen(true);
              }}
              onDelete={askDeleteUrl}
            />
          </Suspense>
        ) : (
          <CredentialsView
            entries={vault.entries}
            onAdd={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            onEdit={(entry) => {
              setEditing(entry);
              setModalOpen(true);
            }}
            onDelete={askDelete}
          />
        )}

        <footer className="mt-12 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500 dark:border-slate-800/60 dark:text-slate-500">
          End-to-end encrypted with AES-256-GCM. Master password never leaves this browser.
        </footer>
      </main>

      <Modal
        open={modalOpen}
        title={editing ? "Edit credential" : "Add credential"}
        onClose={() => {
          if (savingEntry) return;
          setModalOpen(false);
          setEditing(null);
        }}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              disabled={savingEntry}
            >
              <IconX size={16} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              form="credential-form"
              className="btn-primary"
              disabled={savingEntry}
            >
              {savingEntry ? (
                <IconSpinner size={14} />
              ) : editing ? (
                <IconCheck size={16} />
              ) : (
                <IconPlus size={16} />
              )}
              <span>
                {savingEntry
                  ? editing
                    ? "Saving..."
                    : "Adding..."
                  : editing
                    ? "Save changes"
                    : "Add credential"}
              </span>
            </button>
          </>
        }
      >
        <CredentialForm
          initial={editing ?? undefined}
          urlAppEnvs={urlAppEnvs}
          onSubmit={handleSaveEntry}
        />
      </Modal>

      <Modal
        open={urlModalOpen}
        title={editingUrl ? "Edit URL" : "Add URL"}
        onClose={() => {
          if (savingUrl) return;
          setUrlModalOpen(false);
          setEditingUrl(null);
        }}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setUrlModalOpen(false);
                setEditingUrl(null);
              }}
              disabled={savingUrl}
            >
              <IconX size={16} />
              <span>Cancel</span>
            </button>
            <button type="submit" form="url-form" className="btn-primary" disabled={savingUrl}>
              {savingUrl ? (
                <IconSpinner size={14} />
              ) : editingUrl ? (
                <IconCheck size={16} />
              ) : (
                <IconPlus size={16} />
              )}
              <span>
                {savingUrl
                  ? editingUrl
                    ? "Saving..."
                    : "Adding..."
                  : editingUrl
                    ? "Save changes"
                    : "Add URL"}
              </span>
            </button>
          </>
        }
      >
        <UrlForm
          initial={editingUrl ?? undefined}
          knownApps={knownUrlApps}
          knownVariants={knownUrlVariants}
          onSubmit={handleSaveUrl}
        />
      </Modal>

      <ImportModal
        open={importOpen}
        text={importText}
        password={importPassword}
        passwordVisible={importPasswordVisible}
        error={importError}
        onChangeText={setImportText}
        onChangePassword={setImportPassword}
        onTogglePasswordVisible={() => setImportPasswordVisible((v) => !v)}
        onClose={closeImport}
        onImport={performImport}
      />

      <ConfirmModal
        state={confirm}
        pending={confirmPending}
        onCancel={() => setConfirm({ open: false })}
        onConfirm={() => confirm.onConfirm?.()}
      />
    </div>
  );
}

async function decodeNotesCache(
  cache: NotesCache,
  key: CryptoKey
): Promise<Map<string, NoteEntry>> {
  const out = new Map<string, NoteEntry>();
  for (const [id, doc] of Object.entries(cache)) {
    try {
      const note = await decryptJson<NoteEntry>(key, {
        ciphertext: doc.ciphertext,
        iv: doc.iv,
      });
      if (note?.id) out.set(note.id, note);
      else out.set(id, { ...(note as NoteEntry), id });
    } catch {
      // skip un-decryptable
    }
  }
  return out;
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
