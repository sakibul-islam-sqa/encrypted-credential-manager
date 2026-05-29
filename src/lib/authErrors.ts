export class RequiresRecentLoginError extends Error {
  constructor() {
    super("Please sign out and sign back in, then try deleting your account again.");
    this.name = "RequiresRecentLoginError";
  }
}

export class ReauthCancelledError extends Error {
  constructor() {
    super("Re-authentication was cancelled.");
    this.name = "ReauthCancelledError";
  }
}

export class ReauthMismatchError extends Error {
  constructor() {
    super("You re-authenticated with a different account. Please use the same account.");
    this.name = "ReauthMismatchError";
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super("Incorrect password. Please try again.");
    this.name = "WrongPasswordError";
  }
}

export class NoSupportedProviderError extends Error {
  constructor() {
    super("This account uses a sign-in method that cannot be re-authenticated here.");
    this.name = "NoSupportedProviderError";
  }
}
