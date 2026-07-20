/**
 * Pure helpers for the Scribe's Seal auth flows — password validation and
 * Supabase-error-to-app-voice mapping. Kept SDK-free so they unit-test without
 * any Supabase mock (the same seam philosophy as CloudTransport).
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Validate a new password + confirmation; returns an error message or null. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `The password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return "The two passwords don't match.";
  }
  return null;
}

/**
 * Map a raw Supabase auth error message to the app's voice. Matching is on
 * substrings of the messages Supabase actually returns; anything unrecognized
 * falls through to a calm generic line (the app remains fully usable locally).
 */
export function mapAuthError(message: string | undefined | null): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email and password don't match a Scribe's account.";
  }
  if (m.includes("email not confirmed")) {
    return "This account's email hasn't been verified yet — open the confirmation link that was sent to it, or resend it below.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "An account already exists for this email — sign in instead, or use “Forgot password”.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts for now — wait a little and try again.";
  }
  if (m.includes("should be at least") && m.includes("password")) {
    return `The password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return message?.trim()
    ? message
    : "Something went wrong reaching the Scribes' Cloud — the Treasury remains fully usable locally.";
}

/**
 * Supabase's signUp quirk: when the email is already registered (and email
 * confirmations are on), it "succeeds" with a user whose identities are empty
 * rather than returning an error. Detect that case.
 */
export function isAlreadyRegistered(user: { identities?: unknown[] | null } | null): boolean {
  return Boolean(user && (user.identities?.length ?? 0) === 0);
}
