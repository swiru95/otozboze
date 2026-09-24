/**
 * Errors that the UI has to recognise after they crossed the server/client
 * boundary.
 *
 * In production Next.js replaces the `message` of anything thrown in a Server
 * Component with a generic string, so matching on text works in development
 * and silently stops working once the app is built. What does survive is
 * `digest`: Next respects a digest the error already carries instead of
 * hashing one, so a fixed constant here arrives intact in `error.tsx`.
 */
export const FORBIDDEN_DIGEST = "OTOZBOZE_FORBIDDEN";

/** Raised when a signed-in user lacks the capability a section requires. */
export class ForbiddenError extends Error {
  readonly digest = FORBIDDEN_DIGEST;

  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** True for the error object an error boundary receives, client-side. */
export function isForbidden(error: { digest?: string }) {
  return error.digest === FORBIDDEN_DIGEST;
}
