import { prisma } from "@/lib/db/prisma";

/** Everything the profile UI needs: brand mark plus the facilities gallery. */
export async function getProfileImages(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      image: true,
      logoUrl: true,
      galleryUrls: true,
      company: { select: { name: true } },
    },
  });

  return {
    name: user.name,
    image: user.image,
    logoUrl: user.logoUrl,
    galleryUrls: user.galleryUrls,
    companyName: user.company?.name ?? null,
  };
}
