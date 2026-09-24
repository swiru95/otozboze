"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

const withdrawOfferSchema = z.object({ offerId: z.string().min(1) });

/**
 * Takes a listing off the board: ACTIVE -> CANCELLED.
 *
 * Only the farmer who owns the offer may do it, and only while nobody has
 * bought it. Ownership and status are both in the WHERE clause rather than in
 * a prior read, so a concurrent purchase and a forged id fail the same way:
 * zero rows updated.
 *
 * A paid highlight is not refunded. The promotion was delivered while the
 * offer was on the board, so the charge stands.
 */
export async function withdrawOffer(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("FARMER");

  const parsed = withdrawOfferSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { ok: false, error: "Niepoprawna oferta" };
  }

  const withdrawn = await prisma.grainOffer.updateMany({
    where: {
      id: parsed.data.offerId,
      farmerId: user.id,
      status: "ACTIVE",
    },
    data: { status: "CANCELLED" },
  });

  if (withdrawn.count === 0) {
    // Deliberately one message for every failure: a wrong id must not reveal
    // whether somebody else's offer exists.
    return {
      ok: false,
      error: "Nie można wycofać tej oferty — mogła już zostać sprzedana.",
    };
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "offer.withdrawn",
      entityType: "GrainOffer",
      entityId: parsed.data.offerId,
    },
  });

  revalidatePath("/farmer");
  revalidatePath("/buyer");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true };
}
