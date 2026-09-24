import { cookies } from "next/headers";

import type { UserRole } from "@/generated/prisma/enums";
import { DEMO_MODE_ENABLED } from "@/lib/auth/demo";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError } from "@/lib/errors";

/**
 * Demo mode: the active user is held in a cookie instead of a real login.
 * This is the SESSION SOURCE only — authorisation still reads `user.roles`
 * server-side. Replaced by Auth.js + Cognito without touching callers.
 */
export const DEMO_USER_COOKIE = "demo_user_id";

export type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getCurrentUser() {
  // Read the request's cookies first, in every mode. Resolving a session is
  // per-request by nature, and `cookies()` is what marks these routes dynamic
  // — returning early without it would let Next try to prerender pages whose
  // whole content depends on who is asking, and the build would fail on the
  // "no session" throw.
  const store = await cookies();

  // Outside demo mode there is no cookie-based session at all. Null here makes
  // `requireUser()` throw rather than silently handing a visitor somebody
  // else's account.
  if (!DEMO_MODE_ENABLED) return null;

  const id = store.get(DEMO_USER_COOKIE)?.value;

  if (id) {
    const found = await prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });
    if (found) return found;
  }

  // Fall back to an ordinary trading account, never to an administrator: a
  // visitor who has not picked anybody must not inherit platform-wide read
  // access. Reaching the admin section is a deliberate choice in the picker.
  return prisma.user.findFirst({
    where: { NOT: { roles: { has: "ADMIN" } } },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new ForbiddenError(
      DEMO_MODE_ENABLED
        ? "Brak aktywnego użytkownika — uruchom `npx prisma db seed`."
        : "Brak sesji — zaloguj się, aby korzystać z platformy.",
    );
  }
  return user;
}

/** The capability the UI is currently presenting, always a member of `roles`. */
export function resolveActiveRole(user: {
  roles: UserRole[];
  activeRole: UserRole | null;
}): UserRole | null {
  if (user.activeRole && user.roles.includes(user.activeRole)) {
    return user.activeRole;
  }
  return user.roles[0] ?? null;
}

export async function getSession() {
  const user = await requireUser();
  return { user, activeRole: resolveActiveRole(user) };
}
