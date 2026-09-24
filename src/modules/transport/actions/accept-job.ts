"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";

export type ActionResult = { ok: true } | { ok: false; error: string };

const claimJobSchema = z.object({ jobId: z.string().min(1) });

/**
 * A carrier puts themselves forward for a load: AVAILABLE -> ASSIGNED.
 *
 * This is an application, not a confirmation. The buyer still has to accept
 * the carrier, so nothing is charged here — a haulier must never pay for a
 * lead that the other side can refuse. The commission is booked when the
 * buyer approves, in `approveCarrier`.
 *
 * Note the deliberate asymmetry with buying: a carrier who is also the seller
 * MAY haul their own load, so there is no self-dealing guard.
 */
export async function claimJob(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireCapability("TRANSPORT");

  const parsed = claimJobSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { ok: false, error: "Niepoprawne zlecenie" };
  }

  // Status and carrier are both in the WHERE, so two carriers racing for the
  // same load cannot both win.
  const claimed = await prisma.transportJob.updateMany({
    where: { id: parsed.data.jobId, status: "AVAILABLE", carrierId: null },
    data: {
      status: "ASSIGNED",
      carrierId: user.id,
      acceptedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    return { ok: false, error: "Zlecenie zostało już zajęte" };
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "transport.claimed",
      entityType: "TransportJob",
      entityId: parsed.data.jobId,
    },
  });

  revalidatePath("/transport");
  revalidatePath("/buyer");
  revalidatePath("/admin");

  return { ok: true };
}
