/**
 * Encrypted backup format used by the Import / Export buttons.
 *
 * The wire format is a wrapper JSON document that contains a single AES-GCM
 * encrypted blob. The blob's plaintext is a `FullBackup` JSON object:
 *
 *     {
 *       type: "credential-manager-export",
 *       v: 3,                     // export schema version
 *       exportedAt: ISO-8601,
 *       includes: ["credentials", "urls", "notes"],
 *       blob: { ciphertext, iv, salt },  // AES-GCM-256 + PBKDF2 salt
 *     }
 *
 * The salt travels with the blob so the file is self-contained: the recipient
 * only needs the master password that was active at export time. Backwards
 * compatibility with v2 (credentials-only) exports is preserved.
 */

import type { EncryptedPayload } from "./cryptoZK";
import type { NoteEntry, Vault } from "../types";

export const BACKUP_SCHEMA_VERSION = 3;
export const BACKUP_TYPE = "credential-manager-export";

export interface FullBackup {
  version: 1;
  vault: Vault;
  notes: NoteEntry[];
}

export type EncryptedBackupBlob = Pick<EncryptedPayload, "ciphertext" | "iv" | "salt">;

export interface BackupEnvelope {
  type: typeof BACKUP_TYPE;
  v: number;
  exportedAt: string;
  includes: string[];
  blob: EncryptedBackupBlob;
}

/** Build the outer envelope written to disk. */
export function buildBackupEnvelope(
  blob: EncryptedBackupBlob,
  exportedAt: string = new Date().toISOString()
): BackupEnvelope {
  return {
    type: BACKUP_TYPE,
    v: BACKUP_SCHEMA_VERSION,
    exportedAt,
    includes: ["credentials", "urls", "notes"],
    blob,
  };
}

/** Suggested filename: includes the export date for human sortability. */
export function backupFilename(exportedAt: string): string {
  return `credential-manager-full-${exportedAt.slice(0, 10)}.json`;
}

/* --------------------------- Validators / type guards --------------------- */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function isEncryptedBackupBlob(value: unknown): value is EncryptedBackupBlob {
  const record = asRecord(value);
  return (
    !!record &&
    typeof record.ciphertext === "string" &&
    typeof record.iv === "string" &&
    typeof record.salt === "string"
  );
}

export function isVault(value: unknown): value is Vault {
  const record = asRecord(value);
  return (
    !!record &&
    record.version === 1 &&
    Array.isArray(record.entries) &&
    typeof record.updatedAt === "number" &&
    (record.urls === undefined || Array.isArray(record.urls))
  );
}

export function isNoteEntry(value: unknown): value is NoteEntry {
  const record = asRecord(value);
  return (
    !!record &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.body === "string" &&
    typeof record.createdAt === "number" &&
    typeof record.updatedAt === "number"
  );
}

export function isFullBackup(value: unknown): value is FullBackup {
  const record = asRecord(value);
  return (
    !!record &&
    record.version === 1 &&
    isVault(record.vault) &&
    Array.isArray(record.notes) &&
    record.notes.every(isNoteEntry)
  );
}

/** Pull the envelope `v` (export schema version) from arbitrary parsed JSON. */
export function getEnvelopeVersion(envelope: unknown): number {
  const record = asRecord(envelope);
  if (record && typeof record.v === "number") return record.v;
  // older exports omitted `v`; assume v2 (credentials-only).
  return 2;
}

/* --------------------------- Three-way merge ------------------------------ */

export interface MergeStats {
  added: number;
  updated: number;
}

export interface MergeResult<T> {
  items: T[];
  stats: MergeStats;
}

/**
 * Last-writer-wins merge for arrays of `{ id, updatedAt }` items. The incoming
 * item replaces the current one only if its `updatedAt` is strictly newer.
 * New ids are always added.
 */
export function mergeById<T extends { id: string; updatedAt: number }>(
  current: readonly T[],
  incoming: readonly T[]
): MergeResult<T> {
  const byId = new Map(current.map((item) => [item.id, item]));
  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      added++;
    } else if ((item.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
      byId.set(item.id, item);
      updated++;
    }
  }
  return {
    items: Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    stats: { added, updated },
  };
}

/** Trigger a browser download for the given JSON envelope. */
export function downloadBackup(envelope: BackupEnvelope): void {
  const data = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename(envelope.exportedAt);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
