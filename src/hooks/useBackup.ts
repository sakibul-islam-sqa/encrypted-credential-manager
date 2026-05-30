import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { NoteEntry, Vault } from "../types";
import { deriveKey, decryptJson, encryptJson } from "../lib/cryptoZK";
import {
  buildBackupEnvelope,
  downloadBackup,
  getEnvelopeVersion,
  isEncryptedBackupBlob,
  isFullBackup,
  isOurBackupEnvelope,
  isVault,
  mergeById,
  type FullBackup,
} from "../lib/backup";
import type { ToastApi } from "../components/Toast";
import type { UnlockKey } from "./useVault";

interface UseBackupArgs {
  vault: Vault | null;
  unlock: UnlockKey | null;
  notes: Map<string, NoteEntry>;
  notesLoaded: boolean;
  setNotes: Dispatch<SetStateAction<Map<string, NoteEntry>>>;
  persist: (updater: (v: Vault) => Vault) => Promise<void>;
  persistNote: (note: NoteEntry) => Promise<void>;
  toast: ToastApi;
}

export interface BackupController {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importOpen: boolean;
  importText: string;
  importPassword: string;
  importPasswordVisible: boolean;
  importError: string | null;
  setImportText: Dispatch<SetStateAction<string>>;
  setImportPassword: Dispatch<SetStateAction<string>>;
  togglePasswordVisible: () => void;
  exportEncrypted: () => Promise<void>;
  onPickImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  closeImport: () => void;
  performImport: () => Promise<void>;
}

/** Encrypted full-backup export and import (vault + notes), merged by id. */
export function useBackup({
  vault,
  unlock,
  notes,
  notesLoaded,
  setNotes,
  persist,
  persistNote,
  toast,
}: UseBackupArgs): BackupController {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importPasswordVisible, setImportPasswordVisible] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const togglePasswordVisible = () => setImportPasswordVisible((v) => !v);

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
    if (!isOurBackupEnvelope(parsedEnvelope)) {
      setImportError("File doesn't look like a Credential Manager export.");
      return;
    }
    const envelope = parsedEnvelope as Record<string, unknown>;
    const blob = envelope.blob;
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
        // Only re-encrypt and push notes that the merge actually replaced or
        // added; existing notes whose `updatedAt` was newer locally don't
        // need a network round-trip.
        const existingByIdAt = new Map(Array.from(notes.values()).map((n) => [n.id, n.updatedAt]));
        for (const note of noteMerge.items) {
          const prevUpdatedAt = existingByIdAt.get(note.id);
          if (prevUpdatedAt === undefined || note.updatedAt > prevUpdatedAt) {
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

  return {
    fileInputRef,
    importOpen,
    importText,
    importPassword,
    importPasswordVisible,
    importError,
    setImportText,
    setImportPassword,
    togglePasswordVisible,
    exportEncrypted,
    onPickImportFile,
    closeImport,
    performImport,
  };
}
