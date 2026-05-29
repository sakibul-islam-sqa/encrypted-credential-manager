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
import {
  NoSupportedProviderError,
  ReauthCancelledError,
  ReauthMismatchError,
  RequiresRecentLoginError,
  WrongPasswordError,
} from "../lib/authErrors";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string | null;
  providerIds: string[];
}

export type ReauthMethod = "google" | "password";

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
  reauthenticate: (password?: string) => Promise<void>;
  ensureRecentAuth: (password?: string) => Promise<void>;
  isSessionFresh: () => boolean;
  deleteAccount: () => Promise<void>;
  getReauthMethod: () => ReauthMethod | null;
}

// Firebase requires "recent login" for sensitive operations like account
// deletion. The documented window is roughly 5 minutes since the last sign-in.
// We use a slightly tighter threshold to give clock skew a margin.
const RECENT_LOGIN_MS = 4 * 60 * 1000;

function firebaseErrorCode(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  ) {
    return (err as { code: string }).code;
  }
  return null;
}

function lastSignInAge(user: { metadata: { lastSignInTime?: string | null } }): number {
  const t = user.metadata.lastSignInTime;
  if (!t) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(t);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Date.now() - parsed;
}

function pickReauthMethod(providerData: Array<{ providerId: string }>): ReauthMethod | null {
  const ids = new Set(providerData.map((p) => p.providerId));
  if (ids.has("password")) return "password";
  if (ids.has("google.com")) return "google";
  return null;
}

const Ctx = createContext<AuthCtx | null>(null);

function toAuthUser(u: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: Array<{ providerId: string }>;
}): AuthUser {
  const providerIds = u.providerData.map((p) => p.providerId);
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    providerId: providerIds[0] ?? null,
    providerIds,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cloudEnabled = isCloudConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(cloudEnabled);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const lastUidRef = useRef<string | null>(null);
  const lastSignInTimeRef = useRef<string | null>(null);

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
        if (cancelled) return;
        if (!u) {
          setUser(null);
          setSessionExpiresAt(null);
          lastUidRef.current = null;
          lastSignInTimeRef.current = null;
          setLoading(false);
          return;
        }

        lastSignInTimeRef.current = u.metadata.lastSignInTime ?? null;
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
          if (cancelled) return;
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

  const getReauthMethod = useCallback((): ReauthMethod | null => {
    if (!user) return null;
    return pickReauthMethod(user.providerIds.map((providerId) => ({ providerId })));
  }, [user]);

  const reauthenticate = useCallback(async (password?: string) => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Cloud is not configured for this app.");
    const current = fb.auth.currentUser;
    if (!current) throw new Error("Not signed in.");

    const method = pickReauthMethod(current.providerData);
    if (!method) throw new NoSupportedProviderError();

    if (method === "password") {
      if (!password) throw new RequiresRecentLoginError();
      if (!current.email) throw new NoSupportedProviderError();
      const { EmailAuthProvider, reauthenticateWithCredential } = await import("firebase/auth");
      const credential = EmailAuthProvider.credential(current.email, password);
      try {
        await reauthenticateWithCredential(current, credential);
      } catch (err) {
        const code = firebaseErrorCode(err);
        if (
          code === "auth/wrong-password" ||
          code === "auth/invalid-credential" ||
          code === "auth/invalid-login-credentials"
        ) {
          throw new WrongPasswordError();
        }
        throw err;
      }
      return;
    }

    // method === "google"
    const { GoogleAuthProvider, reauthenticateWithPopup } = await import("firebase/auth");
    const provider = new GoogleAuthProvider();
    // Bind the popup to the currently signed-in Google account so the user
    // cannot accidentally re-auth as a different account (which would fail
    // the subsequent delete with a credential mismatch).
    if (current.email) provider.setCustomParameters({ login_hint: current.email });
    try {
      const result = await reauthenticateWithPopup(current, provider);
      if (result.user.uid !== current.uid) {
        throw new ReauthMismatchError();
      }
    } catch (err) {
      if (err instanceof ReauthMismatchError) throw err;
      const code = firebaseErrorCode(err);
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/user-cancelled"
      ) {
        throw new ReauthCancelledError();
      }
      if (code === "auth/user-mismatch") {
        throw new ReauthMismatchError();
      }
      throw err;
    }
  }, []);

  const isSessionFresh = useCallback((): boolean => {
    const t = lastSignInTimeRef.current;
    if (!t) return false;
    const parsed = Date.parse(t);
    if (Number.isNaN(parsed)) return false;
    return Date.now() - parsed < RECENT_LOGIN_MS;
  }, []);

  const ensureRecentAuth = useCallback(
    async (password?: string) => {
      const fb = await getFirebase();
      if (!fb) throw new Error("Cloud is not configured for this app.");
      const current = fb.auth.currentUser;
      if (!current) throw new Error("Not signed in.");
      // Skip re-auth (and therefore the Google popup / password prompt) if
      // Firebase will still accept the current session for sensitive ops.
      if (lastSignInAge(current) < RECENT_LOGIN_MS) return;
      await reauthenticate(password);
      const refreshed = fb.auth.currentUser;
      if (refreshed) lastSignInTimeRef.current = refreshed.metadata.lastSignInTime ?? null;
    },
    [reauthenticate]
  );

  const deleteAccount = useCallback(async () => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Cloud is not configured for this app.");
    const current = fb.auth.currentUser;
    if (!current) throw new Error("Not signed in.");
    const { deleteUser } = await import("firebase/auth");
    try {
      await deleteUser(current);
    } catch (err) {
      if (firebaseErrorCode(err) === "auth/requires-recent-login") {
        throw new RequiresRecentLoginError();
      }
      throw err;
    }
    // Local state is intentionally not cleared here: onAuthStateChanged will
    // fire with `null` once the auth user is deleted and reset everything.
    clearSession();
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
      reauthenticate,
      ensureRecentAuth,
      isSessionFresh,
      deleteAccount,
      getReauthMethod,
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
      reauthenticate,
      ensureRecentAuth,
      isSessionFresh,
      deleteAccount,
      getReauthMethod,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
