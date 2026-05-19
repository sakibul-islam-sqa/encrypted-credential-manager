import { INDEXED_DB, STORAGE_KEYS } from "./constants";

const DB_NAME = INDEXED_DB.name;
const STORE_NAME = INDEXED_DB.store;
const DB_VERSION = INDEXED_DB.version;
const RECORD_KEY = INDEXED_DB.recordKey;
const PREF_KEY = STORAGE_KEYS.rememberPref;

export type RememberDuration = "never" | "1h" | "1d" | "7d" | "30d";

export const REMEMBER_OPTIONS: { value: RememberDuration; label: string }[] = [
  { value: "never", label: "Don't remember (ask every refresh)" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export function durationToMs(d: RememberDuration): number {
  switch (d) {
    case "1h":
      return 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

export function readRememberPref(): RememberDuration {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return "never";
    if (REMEMBER_OPTIONS.some((o) => o.value === raw)) {
      return raw as RememberDuration;
    }
  } catch {
    // ignore
  }
  return "never";
}

export function writeRememberPref(d: RememberDuration): void {
  try {
    localStorage.setItem(PREF_KEY, d);
  } catch {
    // ignore
  }
}

export interface KeyCacheRecord {
  uid: string;
  key: CryptoKey;
  salt: string;
  expiresAt: number;
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = run(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error("Transaction aborted"));
        };
      })
  );
}

export async function readCachedKey(uid: string): Promise<KeyCacheRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const rec = (await withStore("readonly", (store) => store.get(RECORD_KEY))) as
      | KeyCacheRecord
      | undefined;
    if (!rec) return null;
    if (rec.uid !== uid) return null;
    if (typeof rec.expiresAt !== "number" || rec.expiresAt < Date.now()) {
      void clearCachedKey();
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}

export async function writeCachedKey(record: KeyCacheRecord): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    await withStore("readwrite", (store) => store.put(record, RECORD_KEY));
  } catch {
    // ignore - cache is best-effort
  }
}

export async function clearCachedKey(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    await withStore("readwrite", (store) => store.delete(RECORD_KEY));
  } catch {
    // ignore
  }
}
