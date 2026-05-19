import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getFirebase, isCloudConfigured } from "../lib/firebase";
import { clearSession, readSession, writeSession } from "../lib/storage";
import { upsertUserProfile } from "../lib/sync";
import { SESSION_TTL_MS } from "../lib/constants";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  cloudEnabled: boolean;
  sessionExpiresAt: number | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function toAuthUser(u: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: Array<{ providerId: string }>;
}): AuthUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    providerId: u.providerData[0]?.providerId ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cloudEnabled = isCloudConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(cloudEnabled);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const lastUidRef = useRef<string | null>(null);

  const doSignOut = useCallback(async () => {
    const fb = await getFirebase();
    if (!fb) return;
    const { signOut } = await import("firebase/auth");
    await signOut(fb.auth);
    clearSession();
    setSessionExpiresAt(null);
  }, []);

  useEffect(() => {
    if (!cloudEnabled) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const fb = await getFirebase();
      if (!fb || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(fb.auth, async (u) => {
        if (!u) {
          setUser(null);
          setSessionExpiresAt(null);
          lastUidRef.current = null;
          setLoading(false);
          return;
        }

        const existing = readSession();
        const now = Date.now();
        if (existing && existing.uid === u.uid && existing.expiresAt > now) {
          setUser(toAuthUser(u));
          setSessionExpiresAt(existing.expiresAt);
          if (lastUidRef.current !== u.uid) {
            lastUidRef.current = u.uid;
            void upsertUserProfile(u.uid, {
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
            });
          }
          setLoading(false);
          return;
        }

        if (existing && existing.uid === u.uid && existing.expiresAt <= now) {
          await doSignOut();
          setLoading(false);
          return;
        }

        const expiresAt = now + SESSION_TTL_MS;
        writeSession({ uid: u.uid, loginAt: now, expiresAt });
        setUser(toAuthUser(u));
        setSessionExpiresAt(expiresAt);
        lastUidRef.current = u.uid;
        void upsertUserProfile(u.uid, {
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
        });
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [cloudEnabled, doSignOut]);

  useEffect(() => {
    if (!sessionExpiresAt) return;
    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      void doSignOut();
      return;
    }
    const id = window.setTimeout(() => {
      void doSignOut();
    }, remaining);
    return () => window.clearTimeout(id);
  }, [sessionExpiresAt, doSignOut]);

  const signUp = useCallback(async (email: string, password: string) => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Cloud is not configured for this app.");
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    await createUserWithEmailAndPassword(fb.auth, email.trim(), password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Cloud is not configured for this app.");
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    await signInWithEmailAndPassword(fb.auth, email.trim(), password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Cloud is not configured for this app.");
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(fb.auth, provider);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Cloud is not configured for this app.");
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(fb.auth, email.trim());
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      cloudEnabled,
      sessionExpiresAt,
      signUp,
      signIn,
      signInWithGoogle,
      signOut: doSignOut,
      sendPasswordReset,
    }),
    [
      user,
      loading,
      cloudEnabled,
      sessionExpiresAt,
      signUp,
      signIn,
      signInWithGoogle,
      doSignOut,
      sendPasswordReset,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
