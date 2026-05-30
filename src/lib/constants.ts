/**
 * Centralized constants used across the app.
 *
 * Keeping storage keys, sentinel filter values, and time-based limits in one
 * place makes auditing and migrations far less error-prone than chasing
 * literal strings throughout the codebase.
 */

/** Stable prefix for every browser-side storage key we own. */
export const APP_NAMESPACE = "credentials-manager";

/** Sentinel values used by the various "All / no filter" dropdowns. */
export const FILTER_ALL = "__ALL__";

/** Sentinel for "no variant" cells in the URL matrix. */
export const NO_VARIANT_KEY = "__NO_VARIANT__";

/** Firebase auth session TTL (7 days). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum password length Firebase enforces for password accounts. */
export const MIN_PASSWORD_LENGTH = 6;

/** Local-storage keys (versioned so future schema changes are explicit). */
export const STORAGE_KEYS = {
  theme: `${APP_NAMESPACE}.theme`,
  rememberPref: `${APP_NAMESPACE}.remember.v1`,
  session: `${APP_NAMESPACE}.session.v1`,
  vaultCachePrefix: `${APP_NAMESPACE}.vault.v2.`,
  notesCachePrefix: `${APP_NAMESPACE}.notes.v1.`,
} as const;

/** IndexedDB names for the master-key cache. */
export const INDEXED_DB = {
  name: APP_NAMESPACE,
  version: 1,
  store: "keyCache",
  recordKey: "current",
} as const;

/** Firestore collection paths. */
export const FIRESTORE = {
  vaults: "vaults",
  users: "users",
  notesRoot: "notes",
  notesItems: "items",
} as const;
