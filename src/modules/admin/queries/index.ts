import { prisma } from "@/lib/db/prisma";

export async function getPlatformStats() {
  const [users, companies, offers, activeOffers, purchases, jobs, openJobs] =
    await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.grainOffer.count(),
      prisma.grainOffer.count({ where: { status: "ACTIVE" } }),
      prisma.purchase.count(),
      prisma.transportJob.count(),
      prisma.transportJob.count({ where: { status: "AVAILABLE" } }),
    ]);

  const traded = await prisma.purchase.aggregate({ _sum: { totalNet: true } });

  return {
    users,
    companies,
    offers,
    activeOffers,
    purchases,
    jobs,
    openJobs,
    tradedValue: traded._sum.totalNet?.toString() ?? "0",
  };
}

export async function listUsers() {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      activeRole: true,
      subscriptionTier: true,
      company: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((user) => ({
    ...user,
    companyName: user.company?.name ?? null,
  }));
}
