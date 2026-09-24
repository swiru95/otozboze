"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";
import { PRICING, startOfMonth } from "@/modules/billing/pricing";

export type ActionResult =
  | { ok: true }
  /** `reason` lets the UI tell a paywall apart from a real failure. */
  | { ok: false; error: string; reason?: "FREE_TIER_CAP" };

const buyOfferSchema = z.object({ offerId: z.string().min(1) });

/** Thrown when a FREE buyer would exceed the monthly purchase allowance. */
class FreeTierCapError extends Error {}

/**
 * A buyer reserves a lot: ACTIVE -> RESERVED, with a PENDING purchase holding
 * the agreed terms. The farmer still has to confirm, so nothing is sold and
 * no transport job exists yet — both happen together in `confirmPurchase`.
 *
 * Monetisation: a FREE buyer may trade up to a monthly cap; beyond it the
 * reservation is refused and the client offers the PRO upgrade. The cap is
 * enforced HERE, inside the transaction — the paywall dialog is only a hint.
 */
export async function buyOffer(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("BUYER");

  const parsed = buyOfferSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { ok: false, error: "Niepoprawna oferta" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const offer = await tx.grainOffer.findUnique({
        where: { id: parsed.data.offerId },
        select: {
          id: true,
          status: true,
          tonnage: true,
          pricePerTonne: true,
          currency: true,
          farmerId: true,
          pickupLocationId: true,
        },
      });

      if (!offer) throw new Error("Oferta nie istnieje");

      // Roles are capability flags, so one account can hold FARMER and BUYER.
      // Reaching both sides of the same trade is not allowed.
      if (offer.farmerId === user.id) {
        throw new Error("Nie możesz kupić własnej oferty");
      }

      // Decimal throughout — money never becomes a JS number.
      const totalNet = offer.tonnage.times(offer.pricePerTonne);

      await assertWithinAllowance(tx, user.id, totalNet);

      // Optimistic guard: only an ACTIVE offer can be reserved, and once.
      const claimed = await tx.grainOffer.updateMany({
        where: { id: offer.id, status: "ACTIVE" },
        data: { status: "RESERVED" },
      });

      if (claimed.count === 0) {
        throw new Error("Oferta nie jest już dostępna");
      }

      const deliveryLocationId = await resolveDeliveryLocationId(
        tx,
        user.companyId,
        offer.pickupLocationId,
      );

      const purchase = await tx.purchase.create({
        data: {
          reference: `PU-${Date.now().toString(36).toUpperCase()}`,
          offerId: offer.id,
          buyerId: user.id,
          // Snapshot the terms — later offer edits must not rewrite history.
          tonnage: offer.tonnage,
          pricePerTonne: offer.pricePerTonne,
          totalNet,
          currency: offer.currency,
          status: "PENDING",
          deliveryLocationId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "purchase.reserved",
          entityType: "Purchase",
          entityId: purchase.id,
          metadata: { offerId: offer.id, totalNet: totalNet.toString() },
        },
      });
    });
  } catch (error) {
    if (error instanceof FreeTierCapError) {
      return { ok: false, error: error.message, reason: "FREE_TIER_CAP" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Zakup nie powiódł się",
    };
  }

  revalidatePath("/buyer");
  revalidatePath("/farmer");
  revalidatePath("/transport");
  revalidatePath("/admin");

  return { ok: true };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Free tier: a monthly ceiling on the net value a buyer may purchase. PRO
 * lifts it entirely. Read inside the transaction so two concurrent buys
 * cannot both slip under the same remaining allowance.
 */
async function assertWithinAllowance(
  tx: Tx,
  buyerId: string,
  totalNet: Prisma.Decimal,
) {
  const buyer = await tx.user.findUniqueOrThrow({
    where: { id: buyerId },
    select: { subscriptionTier: true },
  });

  if (buyer.subscriptionTier === "PRO") return;

  // A reservation the farmer refused is deleted, but any purchase that ever
  // reaches CANCELLED must not keep eating the allowance.
  const spentThisMonth = await tx.purchase.aggregate({
    where: {
      buyerId,
      createdAt: { gte: startOfMonth() },
      status: { not: "CANCELLED" },
    },
    _sum: { totalNet: true },
  });

  const spent = spentThisMonth._sum.totalNet ?? new Prisma.Decimal(0);
  const cap = new Prisma.Decimal(PRICING.freeBuyerMonthlyCapNet);

  if (spent.plus(totalNet).greaterThan(cap)) {
    throw new FreeTierCapError(
      "Ten zakup przekracza miesięczny limit planu darmowego.",
    );
  }
}

/** Deliver to the buyer's own site when it has one, otherwise the nearest hub. */
async function resolveDeliveryLocationId(
  tx: Tx,
  companyId: string | null,
  fallbackId: string,
) {
  if (companyId) {
    const own = await tx.location.findFirst({
      where: { companyId },
      select: { id: true },
    });
    if (own) return own.id;
  }

  const hub = await tx.location.findFirst({
    where: { kind: { in: ["ELEVATOR", "MILL", "PORT", "WAREHOUSE"] } },
    select: { id: true },
  });

  return hub?.id ?? fallbackId;
}
