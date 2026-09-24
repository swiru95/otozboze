import type { UserRole } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/lib/errors";

import { requireUser } from "./session";

/** Roles are capability flags — ask what a user CAN do, never what they "are". */
export function hasCapability(
  user: { roles: UserRole[] },
  capability: UserRole,
) {
  return user.roles.includes(capability);
}

/**
 * The only authorisation primitive. Every Server Action starts with this.
 * `activeRole` is UI state and is deliberately not consulted here.
 */
export async function requireCapability(capability: UserRole) {
  const user = await requireUser();

  if (!hasCapability(user, capability)) {
    // Typed rather than a bare Error: the error boundary must still be able to
    // tell "you may not be here" from "something broke" after a production
    // build has stripped the message.
    throw new ForbiddenError(`Brak uprawnień: wymagana rola ${capability}.`);
  }

  return user;
}
