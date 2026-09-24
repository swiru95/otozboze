"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { UserRole } from "@/generated/prisma/enums";
import { assertDemoMode } from "@/lib/auth/demo";
import { DEMO_USER_COOKIE, requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Demo-only: swap which seeded user the session represents.
 * Production replaces this with a real Cognito sign-in; every authorisation
 * check still reads `roles` from the database, so nothing else changes.
 *
 * This action hands the caller ANY account, so it is gated on demo mode. A
 * Server Action stays callable over the network for as long as it exists in
 * the bundle, which makes the guard the only thing standing between a request
 * and a full identity bypass — it belongs here, not in the component that
 * renders the picker.
 */
export async function switchDemoUser(userId: string) {
  assertDemoMode();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true },
  });

  const store = await cookies();
  store.set(DEMO_USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
}

/**
 * Change which capability the UI is presenting. This is presentation state:
 * it can only ever select a role the user already holds, and it grants nothing.
 */
export async function switchActiveRole(role: UserRole) {
  const user = await requireUser();

  if (!user.roles.includes(role)) {
    throw new Error("Nie posiadasz tej roli.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeRole: role },
  });

  revalidatePath("/", "layout");
}
