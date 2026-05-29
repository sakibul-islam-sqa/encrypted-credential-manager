// Hands the just-used sign-in credential to the browser's native password
// manager via the Credential Management API. This is a progressive
// enhancement for Chromium-based browsers: in a single-page app the sign-in
// form unmounts immediately after a successful login, which can prevent the
// browser's "save password?" heuristic from firing. Explicitly calling
// `navigator.credentials.store(...)` makes the save reliable there.
//
// Safari and Firefox do not implement PasswordCredential; they fall back to
// the standard form-based autofill heuristics (driven by the input
// `name`/`autocomplete` attributes), so this is a no-op on those browsers.
//
// No secret is ever persisted by the app itself - the credential lives only in
// the browser/OS keychain.

interface PasswordCredentialData {
  id: string;
  password: string;
  name?: string;
}

interface PasswordCredentialCtor {
  // PasswordCredential is part of the Credential Management API but is not in
  // the TypeScript DOM lib, so we declare the minimal shape we use here.
  new (data: PasswordCredentialData): Credential;
}

/**
 * Offers the sign-in email + password to the browser's password manager so it
 * can be saved and prefilled on the next visit. Silently does nothing when the
 * API is unavailable (non-Chromium browsers, insecure context, etc.).
 */
export async function offerCredentialToBrowser(email: string, password: string): Promise<void> {
  try {
    const trimmed = email.trim();
    if (!trimmed || !password) return;

    const ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor })
      .PasswordCredential;
    if (!ctor || typeof navigator.credentials?.store !== "function") return;

    const credential = new ctor({ id: trimmed, password, name: trimmed });
    await navigator.credentials.store(credential);
  } catch {
    // Best-effort only: never let a password-manager hiccup break sign-in.
  }
}
