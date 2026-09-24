"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";
import { PRICING } from "@/modules/billing/pricing";

export type ActionResult = { ok: true } | { ok: false; error: string };

const decisionSchema = z.object({ jobId: z.string().min(1) });

/**
 * The buyer decides who hauls their grain. Nobody chose the carrier until
 * now: they put themselves forward, and a truck is about to arrive at the
 * farmer's yard, so the party paying for the freight approves it.
 *
 * The pay-per-lead commission is booked here, in the same transaction as the
 * approval, because this is the moment the lead is actually worth something.
 */
export async function approveCarrier(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("BUYER");

  const parsed = decisionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: "Niepoprawne zlecenie" };

  try {
    await prisma.$transaction(async (tx) => {
      // Ownership is resolved from the row itself: the job must hang off a
      // purchase this buyer made. A forged id simply matches nothing.
      const job = await tx.transportJob.findFirst({
        where: {
          id: parsed.data.jobId,
          status: "ASSIGNED",
          purchase: { buyerId: user.id },
        },
        select: { id: true, reference: true, carrierId: true, purchaseId: true },
      });

      if (!job || !job.carrierId) {
        throw new Error("Nie można zaakceptować tego przewoźnika");
      }

      const approved = await tx.transportJob.updateMany({
        where: { id: job.id, status: "ASSIGNED" },
        data: {
          status: "IN_TRANSIT",
          commissionFeePaid: true,
          commissionFeeNet: PRICING.transportCommissionNet,
          commissionPaidAt: new Date(),
        },
      });

      if (approved.count === 0) {
        throw new Error("Zlecenie zmieniło już status");
      }

      await tx.purchase.update({
        where: { id: job.purchaseId },
        data: { status: "IN_TRANSPORT" },
      });

      await tx.platformCharge.create({
        data: {
          kind: "TRANSPORT_COMMISSION",
          userId: job.carrierId,
          transportJobId: job.id,
          amountNet: PRICING.transportCommissionNet,
          description: `Prowizja za zlecenie ${job.reference} (symulacja)`,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "transport.carrier_approved",
          entityType: "TransportJob",
          entityId: job.id,
          metadata: {
            carrierId: job.carrierId,
            commissionNet: PRICING.transportCommissionNet,
          },
        },
      });
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Nie udało się zaakceptować",
    };
  }

  revalidatePath("/buyer");
  revalidatePath("/transport");
  revalidatePath("/admin");

  return { ok: true };
}

/** Sends the load back to the freight board for someone else to claim. */
export async function rejectCarrier(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("BUYER");

  const parsed = decisionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: "Niepoprawne zlecenie" };

  const job = await prisma.transportJob.findFirst({
    where: {
      id: parsed.data.jobId,
      status: "ASSIGNED",
      purchase: { buyerId: user.id },
    },
    select: { id: true, carrierId: true },
  });

  if (!job) {
    return { ok: false, error: "Nie można odrzucić tego przewoźnika" };
  }

  const released = await prisma.transportJob.updateMany({
    where: { id: job.id, status: "ASSIGNED" },
    data: { status: "AVAILABLE", carrierId: null, acceptedAt: null },
  });

  if (released.count === 0) {
    return { ok: false, error: "Zlecenie zmieniło już status" };
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "transport.carrier_rejected",
      entityType: "TransportJob",
      entityId: job.id,
      metadata: { carrierId: job.carrierId },
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/transport");
  revalidatePath("/admin");

  return { ok: true };
}
