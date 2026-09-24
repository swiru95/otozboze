import { prisma } from "@/lib/db/prisma";

const purchaseSelect = {
  id: true,
  reference: true,
  status: true,
  tonnage: true,
  pricePerTonne: true,
  totalNet: true,
  createdAt: true,
  expectedDeliveryAt: true,
  buyer: { select: { id: true, name: true, logoUrl: true } },
  offer: {
    select: {
      reference: true,
      grainType: true,
      farmer: { select: { id: true, name: true } },
    },
  },
  deliveryLocation: { select: { city: true } },
  transportJob: { select: { id: true, reference: true, status: true, carrierId: true, carrier: { select: { name: true } } } },
} as const;

type PurchaseRow = Awaited<
  ReturnType<typeof prisma.purchase.findMany<{ select: typeof purchaseSelect }>>
>[number];

function toDto(purchase: PurchaseRow) {
  return {
    id: purchase.id,
    reference: purchase.reference,
    status: purchase.status,
    tonnage: purchase.tonnage.toString(),
    pricePerTonne: purchase.pricePerTonne.toString(),
    totalNet: purchase.totalNet.toString(),
    createdAt: purchase.createdAt,
    expectedDeliveryAt: purchase.expectedDeliveryAt,
    buyerId: purchase.buyer.id,
    buyerName: purchase.buyer.name,
    buyerLogoUrl: purchase.buyer.logoUrl,
    offerReference: purchase.offer.reference,
    grainType: purchase.offer.grainType,
    farmerId: purchase.offer.farmer.id,
    farmerName: purchase.offer.farmer.name,
    deliveryCity: purchase.deliveryLocation.city,
    jobId: purchase.transportJob?.id ?? null,
    jobReference: purchase.transportJob?.reference ?? null,
    jobStatus: purchase.transportJob?.status ?? null,
    carrierId: purchase.transportJob?.carrierId ?? null,
    carrierName: purchase.transportJob?.carrier?.name ?? null,
  };
}

export type PurchaseDto = ReturnType<typeof toDto>;

export async function listPurchasesByBuyer(buyerId: string) {
  const rows = await prisma.purchase.findMany({
    where: { buyerId },
    select: purchaseSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

/** Reservations sitting on this farmer's offers, waiting on their decision. */
export async function listReservationsForFarmer(farmerId: string) {
  const rows = await prisma.purchase.findMany({
    where: { status: "PENDING", offer: { farmerId } },
    select: purchaseSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

export async function listAllPurchases() {
  const rows = await prisma.purchase.findMany({
    select: purchaseSelect,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}
