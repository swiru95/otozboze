"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

const cancelSchema = z.object({ purchaseId: z.string().min(1) });

/**
 * The buyer backs out of their own reservation: offer RESERVED -> ACTIVE.
 *
 * Until now only the farmer could end a reservation, so a buyer who changed
 * their mind had no way out and the lot stayed off the board until the other
 * side happened to act. Both parties can now walk away from something neither
 * of them is bound by yet.
 *
 * Deleted rather than cancelled, exactly like a farmer's refusal:
 * `Purchase.offerId` is unique, so a lingering row would block every future
 * buyer. The audit log keeps the trace.
 */
export async function cancelReservation(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("BUYER");

  const parsed = cancelSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: "Niepoprawna rezerwacja" };

  try {
    await prisma.$transaction(async (tx) => {
      // Ownership comes from the row: it must be this buyer's own reservation,
      // and it must still be only a reservation. A forged id matches nothing.
      const purchase = await tx.purchase.findFirst({
        where: {
          id: parsed.data.purchaseId,
          buyerId: user.id,
          status: "PENDING",
          offer: { status: "RESERVED" },
        },
        select: { id: true, reference: true, offerId: true },
      });

      if (!purchase) {
        throw new Error(
          "Nie można wycofać tej rezerwacji — rolnik mógł ją już potwierdzić.",
        );
      }

      const released = await tx.grainOffer.updateMany({
        where: { id: purchase.offerId, status: "RESERVED" },
        data: { status: "ACTIVE" },
      });

      if (released.count === 0) {
        throw new Error("Oferta zmieniła już status");
      }

      await tx.purchase.delete({ where: { id: purchase.id } });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "purchase.withdrawn",
          entityType: "GrainOffer",
          entityId: purchase.offerId,
          metadata: { reference: purchase.reference },
        },
      });
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Nie udało się wycofać",
    };
  }

  revalidatePath("/buyer");
  revalidatePath("/farmer");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true };
}
