// Path of our own, branded Firebase email-action handler. Point the
// "Customize action URL" field in Firebase Console -> Authentication ->
// Templates at `https://<your-domain>${AUTH_ACTION_PATH}` so reset-password /
// verify-email / recover-email links land here instead of Google's default
// `/__/auth/action` page. Netlify's SPA fallback (`/* -> /index.html`) already
// serves this path; React routes it to <AuthActionPage> (see App.tsx).
export const AUTH_ACTION_PATH = "/auth/action";

export function isAuthActionRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === AUTH_ACTION_PATH;
}
