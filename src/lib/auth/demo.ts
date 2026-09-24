/**
 * The one switch that decides whether the login-less demo shortcut exists.
 *
 * Demo mode picks the session from a cookie instead of an identity provider,
 * and lets the account picker become any seeded user. That is a complete
 * bypass of authentication, so it must never be reachable by accident: it is
 * off in a production build unless somebody deliberately sets `DEMO_MODE`.
 *
 * Authorisation is unaffected either way — `requireCapability()` still reads
 * `roles` from the database.
 */
export const DEMO_MODE_ENABLED =
  process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

/** Thrown when a demo-only path is reached in a build that has demo mode off. */
export function assertDemoMode() {
  if (!DEMO_MODE_ENABLED) {
    throw new Error(
      "Tryb demo jest wyłączony — zaloguj się przez dostawcę tożsamości.",
    );
  }
}
