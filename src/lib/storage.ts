import type { EncryptedNoteDoc, EncryptedVaultDoc } from "./sync";
import type { Vault } from "../types";
import { STORAGE_KEYS } from "./constants";

const ENC_CACHE_PREFIX = STORAGE_KEYS.vaultCachePrefix;
const NOTES_CACHE_PREFIX = STORAGE_KEYS.notesCachePrefix;
const SESSION_KEY = STORAGE_KEYS.session;

export interface SessionInfo {
  uid: string;
  loginAt: number;
  expiresAt: number;
}

export function createEmptyVault(): Vault {
  return { version: 1, entries: [], urls: [], updatedAt: Date.now() };
}

function encCacheKey(uid: string): string {
  return `${ENC_CACHE_PREFIX}${uid}`;
}

export function readEncryptedCache(uid: string): EncryptedVaultDoc | null {
  try {
    const raw = localStorage.getItem(encCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EncryptedVaultDoc;
    if (
      parsed?.schemaVersion !== 2 ||
      typeof parsed.ciphertext !== "string" ||
      typeof parsed.iv !== "string" ||
      typeof parsed.salt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeEncryptedCache(uid: string, doc: EncryptedVaultDoc): void {
  try {
    localStorage.setItem(encCacheKey(uid), JSON.stringify(doc));
  } catch {
    // ignore - storage may be full or blocked
  }
}

export function clearEncryptedCache(uid: string): void {
  try {
    localStorage.removeItem(encCacheKey(uid));
  } catch {
    // ignore
  }
}

function notesCacheKey(uid: string): string {
  return `${NOTES_CACHE_PREFIX}${uid}`;
}

export type NotesCache = Record<string, EncryptedNoteDoc>;

function isEncryptedNoteDoc(value: unknown): value is EncryptedNoteDoc {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.ciphertext === "string" &&
    typeof v.iv === "string" &&
    typeof v.updatedAt === "number" &&
    v.schemaVersion === 1
  );
}

export function readNotesCache(uid: string): NotesCache | null {
  try {
    const raw = localStorage.getItem(notesCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: NotesCache = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isEncryptedNoteDoc(value)) out[id] = value;
    }
    return out;
  } catch {
    return null;
  }
}

export function writeNotesCache(uid: string, cache: NotesCache): void {
  try {
    localStorage.setItem(notesCacheKey(uid), JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function patchNotesCache(uid: string, noteId: string, doc: EncryptedNoteDoc | null): void {
  const current = readNotesCache(uid) ?? {};
  if (doc === null) {
    delete current[noteId];
  } else {
    current[noteId] = doc;
  }
  writeNotesCache(uid, current);
}

export function clearNotesCache(uid: string): void {
  try {
    localStorage.removeItem(notesCacheKey(uid));
  } catch {
    // ignore
  }
}

export function readSession(): SessionInfo | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionInfo;
    if (!parsed?.uid || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(info: SessionInfo): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(info));
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
