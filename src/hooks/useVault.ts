import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Vault } from "../types";
import { createEmptyVault, readEncryptedCache, writeEncryptedCache } from "../lib/storage";
import {
  pullRemoteVault,
  pushEncryptedVault,
  type EncryptedVaultDoc,
  type RemoteVault,
} from "../lib/sync";
import { decryptJson, deriveKey, encryptJson, generateSalt } from "../lib/cryptoZK";
import {
  clearCachedKey,
  durationToMs,
  readCachedKey,
  writeCachedKey,
  type RememberDuration,
} from "../lib/keyCache";
import { toEncryptedVaultDoc } from "../lib/vaultDoc";
import type { MasterPasswordMode } from "../components/MasterPasswordScreen";
import type { ToastApi } from "../components/Toast";
import type { SyncActions } from "./useSyncStatus";

/** The derived AES key plus the salt it was derived from, held only in memory. */
export interface UnlockKey {
  key: CryptoKey;
  salt: string;
}

interface UseVaultArgs {
  userUid: string | null;
  sync: SyncActions;
  toast: ToastApi;
}

export interface VaultController {
  vault: Vault | null;
  remote: RemoteVault | null;
  unlock: UnlockKey | null;
  mpMode: MasterPasswordMode;
  mpBusy: boolean;
  mpError: string | null;
  bootstrapping: boolean;
  bootError: string | null;
  setRemote: Dispatch<SetStateAction<RemoteVault | null>>;
  setMpMode: Dispatch<SetStateAction<MasterPasswordMode>>;
  setMpError: Dispatch<SetStateAction<string | null>>;
  /** Derive the key from the entered master password and unlock/create/migrate. */
  handleMasterPassword: (pw: string, remember: RememberDuration) => Promise<void>;
  /** Apply an update to the vault, persist it locally + remotely. Throws on failure. */
  persist: (updater: (v: Vault) => Vault) => Promise<void>;
  /** Re-pull the remote vault and re-decrypt if it's newer than what we hold. */
  refresh: () => Promise<void>;
  /** Drop the in-memory vault and key (sign out / lock). */
  reset: () => void;
}

/**
 * Owns the encrypted vault lifecycle: bootstrap from cache + remote on login,
 * master-password unlock/create/migrate, and persistence. Notes live in
 * {@link useNotes}; this hook is solely concerned with the credential/URL vault.
 */
export function useVault({ userUid, sync, toast }: UseVaultArgs): VaultController {
  const [vault, setVault] = useState<Vault | null>(null);
  const [remote, setRemote] = useState<RemoteVault | null>(null);
  const [unlock, setUnlock] = useState<UnlockKey | null>(null);
  const [mpMode, setMpMode] = useState<MasterPasswordMode>("unlock");
  const [mpBusy, setMpBusy] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const lastUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userUid) {
      lastUidRef.current = null;
      setVault(null);
      setRemote(null);
      setUnlock(null);
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
      let cachedKey: Awaited<ReturnType<typeof readCachedKey>> = null;

      if (cachedBlob) {
        setRemote({ kind: "encrypted", doc: cachedBlob });
        setMpMode("unlock");
        cachedKey = await readCachedKey(userUid);
        unlockedViaCache = await tryUnlockWithCachedKey(cachedBlob, cachedKey);
      }

      if (!cancelled) setBootstrapping(false);

      try {
        const r = await pullRemoteVault(userUid);
        if (cancelled) return;
        setRemote(r);
        if (r.kind === "encrypted") {
          writeEncryptedCache(userUid, r.doc);
          // If remote is newer than the doc we unlocked from cache, re-decrypt
          // so the user sees the latest data. Without this we'd silently keep
          // serving stale vault state and overwrite remote on next persist.
          const remoteIsNewer =
            !cachedBlob ||
            r.doc.ciphertext !== cachedBlob.ciphertext ||
            r.doc.updatedAt > cachedBlob.updatedAt;
          if (!unlockedViaCache || remoteIsNewer) {
            if (!cachedKey) cachedKey = await readCachedKey(userUid);
            const ok = await tryUnlockWithCachedKey(r.doc, cachedKey);
            if (!ok && !unlockedViaCache) setMpMode("unlock");
          }
        } else if (r.kind === "legacy") {
          setMpMode("migrate");
          await clearCachedKey();
        } else if (!unlockedViaCache) {
          setMpMode("create");
          await clearCachedKey();
        }
      } catch {
        if (!cancelled) {
          if (!cachedBlob) {
            setBootError("Could not load your vault. Check your connection and try again.");
          }
          sync.markError();
        }
      }
    })();

    async function tryUnlockWithCachedKey(
      doc: EncryptedVaultDoc,
      cachedKey: Awaited<ReturnType<typeof readCachedKey>>
    ): Promise<boolean> {
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
        sync.markSynced();
        return true;
      } catch {
        await clearCachedKey();
        return false;
      }
    }

    return () => {
      cancelled = true;
    };
  }, [userUid, sync]);

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
          sync.markSynced();
          resolvedKey = key;
          resolvedSalt = remote.doc.salt;
        } else if (remote.kind === "missing") {
          const salt = generateSalt();
          const key = await deriveKey(pw, salt);
          const empty = createEmptyVault();
          const payload = await encryptJson(key, salt, empty);
          const doc = toEncryptedVaultDoc(payload, salt, empty.updatedAt);
          await pushEncryptedVault(userUid, doc);
          writeEncryptedCache(userUid, doc);
          setRemote({ kind: "encrypted", doc });
          setUnlock({ key, salt });
          setVault(empty);
          sync.markSynced();
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
          const doc = toEncryptedVaultDoc(payload, salt, migrated.updatedAt);
          await pushEncryptedVault(userUid, doc);
          writeEncryptedCache(userUid, doc);
          setRemote({ kind: "encrypted", doc });
          setUnlock({ key, salt });
          setVault(migrated);
          sync.markSynced();
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
    [userUid, remote, toast, sync]
  );

  const persist = useCallback(
    async (updater: (v: Vault) => Vault): Promise<void> => {
      if (!userUid || !vault || !unlock) return;
      const next: Vault = { ...updater(vault), updatedAt: Date.now() };
      setVault(next);
      sync.markSyncing();
      try {
        const payload = await encryptJson(unlock.key, unlock.salt, next);
        const doc = toEncryptedVaultDoc(payload, unlock.salt, next.updatedAt);
        writeEncryptedCache(userUid, doc);
        await pushEncryptedVault(userUid, doc);
        setRemote({ kind: "encrypted", doc });
        sync.markSynced();
      } catch (e) {
        sync.markError();
        throw e;
      }
    },
    [userUid, vault, unlock, sync]
  );

  const refresh = useCallback(async () => {
    if (!userUid || !unlock) return;
    const r = await pullRemoteVault(userUid);
    if (r.kind !== "encrypted") return;
    const cachedBlob = readEncryptedCache(userUid);
    const remoteIsNewer =
      !vault ||
      !cachedBlob ||
      r.doc.ciphertext !== cachedBlob.ciphertext ||
      r.doc.updatedAt > vault.updatedAt;
    writeEncryptedCache(userUid, r.doc);
    setRemote(r);
    if (remoteIsNewer) {
      const plain = await decryptJson<Vault>(unlock.key, {
        ciphertext: r.doc.ciphertext,
        iv: r.doc.iv,
      });
      if (plain?.version === 1 && Array.isArray(plain.entries)) {
        setVault(plain);
      }
    }
  }, [userUid, unlock, vault]);

  const reset = useCallback(() => {
    setUnlock(null);
    setVault(null);
  }, []);

  return {
    vault,
    remote,
    unlock,
    mpMode,
    mpBusy,
    mpError,
    bootstrapping,
    bootError,
    setRemote,
    setMpMode,
    setMpError,
    handleMasterPassword,
    persist,
    refresh,
    reset,
  };
}
