import type { CredentialEntry } from "../types";
import { getFirebase } from "./firebase";
import { FIRESTORE } from "./constants";

export interface EncryptedVaultDoc {
  ciphertext: string;
  iv: string;
  salt: string;
  updatedAt: number;
  schemaVersion: 2;
}

interface LegacyPlaintextDoc {
  entries: CredentialEntry[];
  updatedAt: number;
  schemaVersion: 1;
}

export type RemoteVault =
  | { kind: "encrypted"; doc: EncryptedVaultDoc }
  | { kind: "legacy"; doc: LegacyPlaintextDoc }
  | { kind: "missing" };

const COLLECTION = FIRESTORE.vaults;

export async function pullRemoteVault(uid: string): Promise<RemoteVault> {
  const fb = await getFirebase();
  if (!fb) return { kind: "missing" };
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(fb.db, COLLECTION, uid));
  if (!snap.exists()) return { kind: "missing" };
  const raw = snap.data() as Record<string, unknown>;
  if (raw.schemaVersion === 2 && typeof raw.ciphertext === "string") {
    return {
      kind: "encrypted",
      doc: {
        ciphertext: raw.ciphertext as string,
        iv: raw.iv as string,
        salt: raw.salt as string,
        updatedAt: raw.updatedAt as number,
        schemaVersion: 2,
      },
    };
  }
  if (Array.isArray(raw.entries)) {
    return {
      kind: "legacy",
      doc: {
        entries: raw.entries as CredentialEntry[],
        updatedAt: (raw.updatedAt as number) ?? Date.now(),
        schemaVersion: 1,
      },
    };
  }
  return { kind: "missing" };
}

export async function pushEncryptedVault(uid: string, doc: EncryptedVaultDoc): Promise<void> {
  const fb = await getFirebase();
  if (!fb) throw new Error("Cloud is not available right now.");
  const { doc: docRef, setDoc } = await import("firebase/firestore");
  await setDoc(docRef(fb.db, COLLECTION, uid), doc);
}

export async function deleteCloudVault(uid: string): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(fb.db, COLLECTION, uid));
}

export interface EncryptedNoteDoc {
  ciphertext: string;
  iv: string;
  updatedAt: number;
  schemaVersion: 1;
}

export interface RemoteNote {
  id: string;
  doc: EncryptedNoteDoc;
}

const NOTES_ROOT = FIRESTORE.notesRoot;
const NOTES_ITEMS = FIRESTORE.notesItems;

export async function pullAllNotes(uid: string): Promise<RemoteNote[]> {
  const fb = await getFirebase();
  if (!fb) return [];
  const { collection, getDocs } = await import("firebase/firestore");
  const ref = collection(fb.db, NOTES_ROOT, uid, NOTES_ITEMS);
  const snap = await getDocs(ref);
  const out: RemoteNote[] = [];
  snap.forEach((d) => {
    const raw = d.data() as Record<string, unknown>;
    if (
      raw.schemaVersion === 1 &&
      typeof raw.ciphertext === "string" &&
      typeof raw.iv === "string"
    ) {
      out.push({
        id: d.id,
        doc: {
          ciphertext: raw.ciphertext as string,
          iv: raw.iv as string,
          updatedAt: (raw.updatedAt as number) ?? Date.now(),
          schemaVersion: 1,
        },
      });
    }
  });
  return out;
}

export async function pushNote(uid: string, noteId: string, doc: EncryptedNoteDoc): Promise<void> {
  const fb = await getFirebase();
  if (!fb) throw new Error("Cloud is not available right now.");
  const { doc: docRef, setDoc } = await import("firebase/firestore");
  await setDoc(docRef(fb.db, NOTES_ROOT, uid, NOTES_ITEMS, noteId), doc);
}

export async function deleteNoteRemote(uid: string, noteId: string): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(fb.db, NOTES_ROOT, uid, NOTES_ITEMS, noteId));
}

export async function deleteAllNotesRemote(uid: string): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { collection, getDocs, writeBatch } = await import("firebase/firestore");
  const ref = collection(fb.db, NOTES_ROOT, uid, NOTES_ITEMS);
  const snap = await getDocs(ref);
  if (snap.empty) return;
  const batch = writeBatch(fb.db);
  snap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

interface UserProfileDoc {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
  lastLoginAt: number;
}

export async function upsertUserProfile(
  uid: string,
  data: { email: string | null; displayName: string | null; photoURL: string | null }
): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
  const ref = doc(fb.db, FIRESTORE.users, uid);
  try {
    const snap = await getDoc(ref);
    const now = Date.now();
    if (snap.exists()) {
      await setDoc(
        ref,
        {
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          lastLoginAt: now,
          lastLoginServerAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      const profile: UserProfileDoc = {
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: now,
        lastLoginAt: now,
      };
      await setDoc(ref, {
        ...profile,
        createdServerAt: serverTimestamp(),
        lastLoginServerAt: serverTimestamp(),
      });
    }
  } catch {
    // non-fatal - profile is supplementary
  }
}
