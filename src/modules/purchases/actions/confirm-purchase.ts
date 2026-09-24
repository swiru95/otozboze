"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { requireCapability } from "@/lib/auth/capabilities";
import { addDays, FREIGHT, FULFILMENT_DAYS } from "@/lib/domain";
import { estimateRoadDistanceKm } from "@/lib/geo";
import { prisma } from "@/lib/db/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

const decisionSchema = z.object({ purchaseId: z.string().min(1) });

/**
 * What the platform offers a haulier for this run, net per tonne.
 *
 * Distance drives the rate, with a floor for short hops where loading costs
 * more than driving. When either end has no coordinates the distance is
 * unknown, and a flat rate is more honest than a number derived from nothing.
 */
function freightRatePerTonne(distanceKm: number | null) {
  if (distanceKm === null) {
    return new Prisma.Decimal(FREIGHT.fallbackRatePerTonne);
  }

  const byDistance = new Prisma.Decimal(FREIGHT.ratePerTonneKm).times(
    distanceKm,
  );
  const floor = new Prisma.Decimal(FREIGHT.minRatePerTonne);

  return (byDistance.lessThan(floor) ? floor : byDistance).toDecimalPlaces(2);
}

/**
 * The farmer accepts a reservation: offer RESERVED -> SOLD, purchase PENDING
 * -> CONFIRMED, and the transport job is created — all in ONE transaction.
 *
 * This is where the "no sale without haulage arranged" invariant lives now.
 * A PENDING purchase is only a reservation and deliberately has no job; a
 * CONFIRMED one always does, because both are written together.
 */
export async function confirmPurchase(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("FARMER");

  const parsed = decisionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: "Niepoprawna rezerwacja" };

  try {
    await prisma.$transaction(async (tx) => {
      // Ownership resolved from the row itself: the purchase must sit on an
      // offer this farmer listed. A forged id matches nothing.
      const purchase = await tx.purchase.findFirst({
        where: {
          id: parsed.data.purchaseId,
          status: "PENDING",
          offer: { farmerId: user.id, status: "RESERVED" },
        },
        select: {
          id: true,
          tonnage: true,
          currency: true,
          deliveryLocationId: true,
          // Coordinates come from the two location rows, so the freight rate
          // is derived from the route rather than from a hard-coded constant.
          deliveryLocation: { select: { latitude: true, longitude: true } },
          offer: {
            select: {
              id: true,
              pickupLocationId: true,
              pickupLocation: { select: { latitude: true, longitude: true } },
            },
          },
        },
      });

      if (!purchase) {
        throw new Error("Nie można potwierdzić tej rezerwacji");
      }

      const sold = await tx.grainOffer.updateMany({
        where: { id: purchase.offer.id, status: "RESERVED" },
        data: { status: "SOLD" },
      });

      if (sold.count === 0) {
        throw new Error("Oferta zmieniła już status");
      }

      // Both sides now have a deadline, counted from this moment.
      const deliverBy = addDays(new Date(), FULFILMENT_DAYS);

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "CONFIRMED", expectedDeliveryAt: deliverBy },
      });

      const distanceKm = estimateRoadDistanceKm(
        purchase.offer.pickupLocation,
        purchase.deliveryLocation,
      );
      const freightRate = freightRatePerTonne(distanceKm);

      await tx.transportJob.create({
        data: {
          reference: `TR-${Date.now().toString(36).toUpperCase()}`,
          purchaseId: purchase.id,
          status: "AVAILABLE",
          pickupLocationId: purchase.offer.pickupLocationId,
          deliveryLocationId: purchase.deliveryLocationId,
          tonnage: purchase.tonnage,
          distanceKm,
          deliverBy,
          ratePerTonne: freightRate,
          totalNet: purchase.tonnage.times(freightRate),
          currency: purchase.currency,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "purchase.confirmed",
          entityType: "Purchase",
          entityId: purchase.id,
        },
      });
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Nie udało się potwierdzić",
    };
  }

  revalidatePath("/farmer");
  revalidatePath("/buyer");
  revalidatePath("/transport");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true };
}

/**
 * The farmer refuses: the offer goes back on the board and the reservation is
 * deleted rather than cancelled. `Purchase.offerId` is unique, so a lingering
 * row would block every future buyer; the audit log keeps the trace.
 */
export async function rejectPurchase(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("FARMER");

  const parsed = decisionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: "Niepoprawna rezerwacja" };

  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: {
          id: parsed.data.purchaseId,
          status: "PENDING",
          offer: { farmerId: user.id, status: "RESERVED" },
        },
        select: {
          id: true,
          reference: true,
          buyerId: true,
          totalNet: true,
          offer: { select: { id: true } },
        },
      });

      if (!purchase) {
        throw new Error("Nie można odrzucić tej rezerwacji");
      }

      const released = await tx.grainOffer.updateMany({
        where: { id: purchase.offer.id, status: "RESERVED" },
        data: { status: "ACTIVE" },
      });

      if (released.count === 0) {
        throw new Error("Oferta zmieniła już status");
      }

      await tx.purchase.delete({ where: { id: purchase.id } });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "purchase.rejected",
          entityType: "GrainOffer",
          entityId: purchase.offer.id,
          metadata: {
            reference: purchase.reference,
            buyerId: purchase.buyerId,
            totalNet: purchase.totalNet.toString(),
          },
        },
      });
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Nie udało się odrzucić",
    };
  }

  revalidatePath("/farmer");
  revalidatePath("/buyer");
  revalidatePath("/admin");
  revalidatePath("/");

  return { ok: true };
}
