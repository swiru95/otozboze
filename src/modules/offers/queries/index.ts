import { prisma } from "@/lib/db/prisma";
import { documentSelect } from "@/modules/documents/queries";

/** Decimal and Date never cross into a client component — flatten here. */
const offerSelect = {
  id: true,
  reference: true,
  grainType: true,
  harvestYear: true,
  tonnage: true,
  pricePerTonne: true,
  status: true,
  title: true,
  isHighlighted: true,
  highlightFeeNet: true,
  thumbnailUrl: true,
  createdAt: true,
  farmer: { select: { id: true, name: true } },
  pickupLocation: {
    select: { city: true, postalCode: true, voivodeship: true },
  },
  purchase: {
    select: {
      id: true,
      status: true,
      buyer: { select: { id: true, name: true } },
    },
  },
  documents: { select: documentSelect, orderBy: { createdAt: "desc" } },
} as const;

/**
 * The board deliberately does NOT select `photoUrls`: those are inlined data
 * URLs and would push megabytes into every list render. Only the farmer's own
 * list, which is short, carries the full-size pictures.
 */
const farmerOfferSelect = { ...offerSelect, photoUrls: true } as const;

type OfferRow = Awaited<
  ReturnType<typeof prisma.grainOffer.findMany<{ select: typeof offerSelect }>>
>[number];

function toDto(offer: OfferRow & { photoUrls?: string[] }) {
  return {
    id: offer.id,
    reference: offer.reference,
    grainType: offer.grainType,
    harvestYear: offer.harvestYear,
    tonnage: offer.tonnage.toString(),
    pricePerTonne: offer.pricePerTonne.toString(),
    // Decimal arithmetic, then a string. Multiplying the two as JS numbers
    // would round through binary floating point on the way to the board.
    totalNet: offer.tonnage.times(offer.pricePerTonne).toFixed(2),
    status: offer.status,
    title: offer.title,
    isHighlighted: offer.isHighlighted,
    thumbnailUrl: offer.thumbnailUrl,
    photoUrls: offer.photoUrls ?? [],
    createdAt: offer.createdAt,
    farmerId: offer.farmer.id,
    farmerName: offer.farmer.name,
    city: offer.pickupLocation.city,
    postalCode: offer.pickupLocation.postalCode,
    voivodeship: offer.pickupLocation.voivodeship,
    documents: offer.documents,
    purchaseId: offer.purchase?.id ?? null,
    purchaseStatus: offer.purchase?.status ?? null,
    buyerId: offer.purchase?.buyer.id ?? null,
    buyerName: offer.purchase?.buyer.name ?? null,
  };
}

export type OfferDto = ReturnType<typeof toDto>;

/** Offers listed by one farmer, newest first. */
export async function listOffersByFarmer(farmerId: string) {
  const rows = await prisma.grainOffer.findMany({
    where: { farmerId },
    select: farmerOfferSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

/**
 * The public board: everything currently for sale. Paid highlights come first
 * — that is what the farmer bought — and the client keeps them pinned on top
 * whichever sort the buyer picks.
 */
export async function listActiveOffers() {
  const rows = await prisma.grainOffer.findMany({
    where: { status: "ACTIVE" },
    select: offerSelect,
    orderBy: [{ isHighlighted: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toDto);
}

export async function listAllOffers() {
  const rows = await prisma.grainOffer.findMany({
    select: offerSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}
