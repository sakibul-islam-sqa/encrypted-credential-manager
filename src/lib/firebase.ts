import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

interface FirebaseBundle {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let cached: FirebaseBundle | null = null;
let inflight: Promise<FirebaseBundle | null> | null = null;

export function isCloudConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

export async function getFirebase(): Promise<FirebaseBundle | null> {
  if (cached) return cached;
  if (!isCloudConfigured()) return null;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);
      const app = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      });
      const auth = authMod.getAuth(app);
      try {
        await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      } catch {
        // ignore - some private modes block this
      }
      const db = firestoreMod.getFirestore(app);
      cached = { app, auth, db };
      return cached;
    } catch {
      return null;
    }
  })();

  return inflight;
}

export function translateAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in your Firebase project.";
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email. Try signing in with the original method.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized. Add it in Firebase Console -> Authentication -> Settings -> Authorized domains.";
    default: {
      if (err instanceof Error && err.message) return err.message;
      return "Something went wrong. Please try again.";
    }
  }
}
