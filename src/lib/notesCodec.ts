import type { NoteEntry } from "../types";
import { decryptJson } from "./cryptoZK";
import type { NotesCache } from "./storage";
import type { RemoteNote } from "./sync";

/**
 * Decrypt a remote note document into a `NoteEntry`, tolerating legacy notes
 * that were stored without an embedded `id` (we fall back to the doc id).
 * Returns `null` when the payload can't be decrypted (e.g. it was written
 * under a different master password) or isn't a usable note.
 */
async function decryptNote(
  key: CryptoKey,
  id: string,
  doc: { ciphertext: string; iv: string }
): Promise<NoteEntry | null> {
  try {
    const note = await decryptJson<NoteEntry>(key, {
      ciphertext: doc.ciphertext,
      iv: doc.iv,
    });
    if (!note || typeof note !== "object") return null;
    const resolved: NoteEntry = note.id ? note : { ...note, id };
    return resolved.id ? resolved : null;
  } catch {
    return null;
  }
}

/** Decrypt freshly pulled remote notes into the in-memory map + the local cache. */
export async function remoteNotesToState(
  remoteNotes: RemoteNote[],
  key: CryptoKey
): Promise<{ cache: NotesCache; notes: Map<string, NoteEntry> }> {
  const cache: NotesCache = {};
  const notes = new Map<string, NoteEntry>();
  for (const { id, doc } of remoteNotes) {
    cache[id] = doc;
    const note = await decryptNote(key, id, doc);
    if (note) notes.set(note.id, note);
  }
  return { cache, notes };
}

/** Decrypt the locally cached notes for an instant first paint while remote loads. */
export async function decodeNotesCache(
  cache: NotesCache,
  key: CryptoKey
): Promise<Map<string, NoteEntry>> {
  const out = new Map<string, NoteEntry>();
  for (const [id, doc] of Object.entries(cache)) {
    const note = await decryptNote(key, id, doc);
    if (note) out.set(note.id, note);
  }
  return out;
}
