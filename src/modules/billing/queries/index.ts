import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { CHARGE_KIND_LABELS, PRICING, startOfMonth } from "@/modules/billing/pricing";

const ZERO = new Prisma.Decimal(0);

export type BuyerAllowance = {
  isPro: boolean;
  /** ISO date string, or null while FREE. */
  validUntil: Date | null;
  capNet: string;
  spentNet: string;
  remainingNet: string;
  /** 0-100, for the meter in the banner. */
  usedPct: number;
};

/**
 * How much of this month's free-tier allowance a buyer has left. PRO has no
 * cap, but the spend figure is still useful in the banner.
 */
export async function getBuyerAllowance(
  userId: string,
): Promise<BuyerAllowance> {
  const [user, agg] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionUntil: true },
    }),
    prisma.purchase.aggregate({
      where: {
        buyerId: userId,
        createdAt: { gte: startOfMonth() },
        status: { not: "CANCELLED" },
      },
      _sum: { totalNet: true },
    }),
  ]);

  const isPro = user.subscriptionTier === "PRO";
  const spent = agg._sum.totalNet ?? ZERO;
  const cap = new Prisma.Decimal(PRICING.freeBuyerMonthlyCapNet);
  const left = cap.minus(spent);
  const remaining = left.isNegative() ? ZERO : left;

  return {
    isPro,
    validUntil: user.subscriptionUntil,
    capNet: cap.toString(),
    spentNet: spent.toString(),
    remainingNet: remaining.toString(),
    usedPct: Math.min(
      100,
      Math.max(0, Math.round(spent.div(cap).times(100).toNumber())),
    ),
  };
}

/** True when this purchase would push a FREE buyer past the monthly cap. */
export function exceedsFreeCap(allowance: BuyerAllowance, totalNet: string) {
  if (allowance.isPro) return false;
  return new Prisma.Decimal(totalNet).greaterThan(allowance.remainingNet);
}

/** Platform revenue, split by stream. Powers the ADMIN view. */
export async function getRevenueSummary() {
  const [byKind, all] = await Promise.all([
    prisma.platformCharge.groupBy({
      by: ["kind"],
      _sum: { amountNet: true },
      _count: { _all: true },
    }),
    prisma.platformCharge.aggregate({ _sum: { amountNet: true } }),
  ]);

  const rows = byKind.map((row) => ({
    kind: row.kind,
    label: CHARGE_KIND_LABELS[row.kind],
    totalNet: (row._sum.amountNet ?? ZERO).toString(),
    count: row._count._all,
  }));

  return { rows, totalNet: (all._sum.amountNet ?? ZERO).toString() };
}

export async function listCharges() {
  const rows = await prisma.platformCharge.findMany({
    select: {
      id: true,
      kind: true,
      amountNet: true,
      description: true,
      createdAt: true,
      user: { select: { name: true } },
      offer: { select: { reference: true } },
      transportJob: { select: { reference: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    kindLabel: CHARGE_KIND_LABELS[row.kind],
    amountNet: row.amountNet.toString(),
    description: row.description,
    createdAt: row.createdAt,
    userName: row.user.name,
    reference: row.offer?.reference ?? row.transportJob?.reference ?? "—",
  }));
}
