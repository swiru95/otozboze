import { prisma } from "@/lib/db/prisma";

/** Powers the demo user picker in the navbar. */
export async function listDemoUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, roles: true },
    orderBy: { createdAt: "asc" },
  });
}
