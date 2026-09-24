import { RESERVATION_HOURS, addHours } from "@/lib/domain";
import { prisma } from "@/lib/db/prisma";

/**
 * Puts lots back on the board when the farmer never answered.
 *
 * A reservation moves the offer to RESERVED and takes it off the board, and
 * `Purchase.offerId` is unique — so a farmer who simply stops responding
 * blocks that lot for every future buyer, permanently. The reservation has to
 * have a shelf life.
 *
 * Deliberately not a Server Action: it is housekeeping, not something a user
 * asks for, and exporting it from a `"use server"` file would publish it as a
 * network endpoint. Call it from `after()` in a page, or from a cron once the
 * app has one.
 *
 * Safe to run concurrently. Each release re-checks the status inside its own
 * transaction, so a farmer confirming at the same moment wins and the sweep
 * simply finds nothing to do.
 */
export async function expireStaleReservations() {
  const cutoff = addHours(new Date(), -RESERVATION_HOURS);

  const stale = await prisma.purchase.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      offer: { status: "RESERVED" },
    },
    select: {
      id: true,
      reference: true,
      buyerId: true,
      offerId: true,
    },
  });

  let released = 0;

  for (const purchase of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        const back = await tx.grainOffer.updateMany({
          where: { id: purchase.offerId, status: "RESERVED" },
          data: { status: "ACTIVE" },
        });

        // Somebody acted between the read and now — leave the row alone.
        if (back.count === 0) return;

        const removed = await tx.purchase.deleteMany({
          where: { id: purchase.id, status: "PENDING" },
        });

        if (removed.count === 0) {
          throw new Error("reservation changed under the sweep");
        }

        await tx.auditLog.create({
          data: {
            action: "purchase.expired",
            entityType: "GrainOffer",
            entityId: purchase.offerId,
            metadata: {
              reference: purchase.reference,
              buyerId: purchase.buyerId,
              hours: RESERVATION_HOURS,
            },
          },
        });

        released += 1;
      });
    } catch {
      // A race with a confirmation rolls this one back; the next sweep will
      // find whatever is genuinely stale.
    }
  }

  return released;
}
