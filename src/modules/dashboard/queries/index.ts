import { prisma } from "@/lib/db/prisma";

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type StatTile = {
  label: string;
  value: string;
  /** Where the number leads. Every tile on the dashboard is actionable. */
  href: string;
};

/** What a seller wants on opening the app: what is live, what sold, what waits. */
export async function getFarmerSummary(userId: string) {
  const since = startOfMonth();

  const [active, toConfirm, awaitingCarrier, revenue] = await Promise.all([
    prisma.grainOffer.count({ where: { farmerId: userId, status: "ACTIVE" } }),
    // Reservations sitting on this farmer's desk right now.
    prisma.purchase.count({
      where: { status: "PENDING", offer: { farmerId: userId } },
    }),
    prisma.transportJob.count({
      where: {
        status: "AVAILABLE",
        purchase: { offer: { farmerId: userId } },
      },
    }),
    prisma.purchase.aggregate({
      where: { offer: { farmerId: userId }, createdAt: { gte: since } },
      _sum: { totalNet: true },
    }),
  ]);

  return {
    active,
    toConfirm,
    awaitingCarrier,
    revenueThisMonth: revenue._sum.totalNet?.toString() ?? "0",
  };
}

/** A buyer cares about what is on the board and what is still on the road. */
export async function getBuyerSummary(userId: string) {
  const since = startOfMonth();

  const [onBoard, bought, waiting, spent] = await Promise.all([
    prisma.grainOffer.count({
      where: { status: "ACTIVE", farmerId: { not: userId } },
    }),
    prisma.purchase.count({ where: { buyerId: userId } }),
    // Anything not yet delivered: waiting on a farmer, a carrier or a truck.
    prisma.purchase.count({
      where: {
        buyerId: userId,
        status: { in: ["PENDING", "CONFIRMED", "IN_TRANSPORT"] },
      },
    }),
    prisma.purchase.aggregate({
      where: { buyerId: userId, createdAt: { gte: since } },
      _sum: { totalNet: true },
    }),
  ]);

  return {
    onBoard,
    bought,
    waiting,
    spentThisMonth: spent._sum.totalNet?.toString() ?? "0",
  };
}

/** A haulier cares about free loads and what is already on the truck. */
export async function getCarrierSummary(userId: string) {
  const since = startOfMonth();

  const [openJobs, myRuns, done, earned] = await Promise.all([
    prisma.transportJob.count({ where: { status: "AVAILABLE" } }),
    prisma.transportJob.count({
      where: { carrierId: userId, status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
    }),
    prisma.transportJob.count({ where: { carrierId: userId } }),
    prisma.transportJob.aggregate({
      where: { carrierId: userId, acceptedAt: { gte: since } },
      _sum: { totalNet: true },
    }),
  ]);

  return {
    openJobs,
    myRuns,
    done,
    earnedThisMonth: earned._sum.totalNet?.toString() ?? "0",
  };
}
