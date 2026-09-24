"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { assertCanReview } from "@/modules/reviews/eligibility";
import { submitReviewSchema } from "@/modules/reviews/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function submitReview(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Any signed-in user may review — the gate is the transaction, not a role.
  const user = await requireUser();

  const parsed = submitReviewSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Niepoprawna opinia",
    };
  }

  const input = parsed.data;

  try {
    // The whole point: only a party to this transaction may review, and only
    // their actual counterparty within it.
    await assertCanReview({
      scope: input.scope,
      purchaseId: input.purchaseId,
      transportJobId: input.transportJobId,
      authorId: user.id,
      subjectId: input.subjectId,
    });

    await prisma.review.create({
      data: {
        scope: input.scope,
        purchaseId: input.scope === "TRADE" ? input.purchaseId : null,
        transportJobId:
          input.scope === "TRANSPORT" ? input.transportJobId : null,
        authorId: user.id,
        subjectId: input.subjectId,
        rating: input.rating,
        comment: input.comment || null,
      },
    });
  } catch (error) {
    // The unique index turns a double review into a predictable message.
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Już wystawiłeś opinię w tej transakcji"
        : error instanceof Error
          ? error.message
          : "Nie udało się zapisać opinii";
    return { ok: false, error: message };
  }

  revalidatePath("/buyer");
  revalidatePath("/farmer");
  revalidatePath("/transport");
  revalidatePath("/admin");

  return { ok: true };
}
