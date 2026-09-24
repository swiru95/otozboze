"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";
import { PRICING, PRO_PERIOD_DAYS } from "@/modules/billing/pricing";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Mock upgrade. In production this would be the webhook handler of a payment
 * provider; here the button stands in for a completed payment. The charge row
 * and the entitlement are written together so revenue can never disagree with
 * access.
 */
export async function upgradeToPro(): Promise<ActionResult> {
  const user = await requireCapability("BUYER");

  if (user.subscriptionTier === "PRO") {
    return { ok: true };
  }

  const until = new Date();
  until.setDate(until.getDate() + PRO_PERIOD_DAYS);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          subscriptionTier: "PRO",
          subscribedAt: new Date(),
          subscriptionUntil: until,
        },
      });

      await tx.platformCharge.create({
        data: {
          kind: "BUYER_SUBSCRIPTION",
          userId: user.id,
          amountNet: PRICING.proMonthlyNet,
          description: "Abonament PRO — 30 dni (symulacja)",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "subscription.upgraded",
          entityType: "User",
          entityId: user.id,
          metadata: { tier: "PRO", amountNet: PRICING.proMonthlyNet },
        },
      });
    });
  } catch {
    return { ok: false, error: "Nie udało się aktywować planu PRO" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
