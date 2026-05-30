import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { NoteEntry } from "../types";
import { patchNotesCache, readNotesCache, writeNotesCache } from "../lib/storage";
import { deleteNoteRemote, pullAllNotes, pushNote, type EncryptedNoteDoc } from "../lib/sync";
import { encryptJson } from "../lib/cryptoZK";
import { decodeNotesCache, remoteNotesToState } from "../lib/notesCodec";
import { uid as makeId } from "../lib/id";
import type { NotesViewHandle } from "../components/NotesView";
import type { ToastApi } from "../components/Toast";
import type { ConfirmController } from "./useConfirmDialog";
import type { SyncActions } from "./useSyncStatus";
import type { UnlockKey } from "./useVault";

interface UseNotesArgs {
  userUid: string | null;
  unlock: UnlockKey | null;
  sync: SyncActions;
  toast: ToastApi;
  confirm: ConfirmController;
}

export interface NotesController {
  notes: Map<string, NoteEntry>;
  /** Notes as a stable array reference, rebuilt only when the map changes. */
  notesList: NoteEntry[];
  setNotes: Dispatch<SetStateAction<Map<string, NoteEntry>>>;
  selectedNoteId: string | null;
  setSelectedNoteId: Dispatch<SetStateAction<string | null>>;
  notesLoaded: boolean;
  notesDirty: boolean;
  setNotesDirty: Dispatch<SetStateAction<boolean>>;
  notesViewRef: React.RefObject<NotesViewHandle | null>;
  /** Encrypt + persist a single note locally and remotely. Throws on failure. */
  persistNote: (note: NoteEntry) => Promise<void>;
  handleCreateNote: () => void;
  handleUpdateNote: (id: string, patch: Partial<NoteEntry>) => Promise<void>;
  handleDeleteNote: (id: string) => void;
  /** Re-pull all notes from remote and replace local state. */
  refresh: () => Promise<void>;
  /** Drop all in-memory note state (sign out / lock). */
  reset: () => void;
}

/**
 * Owns the encrypted notes collection: lazy load (cache-then-remote), per-note
 * persistence, and CRUD. Decryption uses the key held by {@link useVault}.
 */
export function useNotes({ userUid, unlock, sync, toast, confirm }: UseNotesArgs): NotesController {
  const [notes, setNotes] = useState<Map<string, NoteEntry>>(new Map());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const notesViewRef = useRef<NotesViewHandle>(null);
  const notesList = useMemo(() => Array.from(notes.values()), [notes]);

  // Guards the load to run once per unlock session. We can't gate on the
  // `notesLoaded` state here: setting it inside the effect (after the cache
  // paint) would re-run the effect and tear down the in-flight remote pull
  // before it resolves, leaving notes stuck on cache-only data. Mirrors the
  // `lastUidRef` approach in useVault.
  const loadedForRef = useRef<UnlockKey | null>(null);

  useEffect(() => {
    if (!userUid || !unlock || loadedForRef.current === unlock) return;
    loadedForRef.current = unlock;
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
        const { cache: nextCache, notes: nextNotes } = await remoteNotesToState(
          remoteNotes,
          unlock.key
        );
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
  }, [userUid, unlock]);

  const persistNote = useCallback(
    async (note: NoteEntry): Promise<void> => {
      if (!userUid || !unlock) return;
      sync.markSyncing();
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
        sync.markSynced();
      } catch (e) {
        sync.markError();
        throw e;
      }
    },
    [userUid, unlock, sync]
  );

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
      confirm.ask({
        title: "Delete note?",
        message: `"${note.title || "Untitled"}" will be permanently deleted. This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
        action: async () => {
          if (!userUid) return;
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
        },
      });
    },
    [notes, selectedNoteId, userUid, toast, confirm]
  );

  const refresh = useCallback(async () => {
    if (!userUid || !unlock) return;
    const remoteNotes = await pullAllNotes(userUid);
    const { cache, notes: next } = await remoteNotesToState(remoteNotes, unlock.key);
    writeNotesCache(userUid, cache);
    setNotes(next);
    setNotesLoaded(true);
  }, [userUid, unlock]);

  const reset = useCallback(() => {
    setNotes(new Map());
    setSelectedNoteId(null);
    setNotesLoaded(false);
    loadedForRef.current = null;
  }, []);

  return {
    notes,
    notesList,
    setNotes,
    selectedNoteId,
    setSelectedNoteId,
    notesLoaded,
    notesDirty,
    setNotesDirty,
    notesViewRef,
    persistNote,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    refresh,
    reset,
  };
}
