"use server";

import { revalidatePath } from "next/cache";

import { LocationKind } from "@/generated/prisma/enums";
import { requireCapability } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db/prisma";
import { PRICING } from "@/modules/billing/pricing";
import {
  mockStorageUrl,
  parseOfferDocuments,
} from "@/modules/documents/schemas";
import { parseOfferPhotos } from "@/modules/images/schemas";
import { createOfferSchema } from "@/modules/offers/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createOffer(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // 1. authorise — capability flag, never activeRole
  const user = await requireCapability("FARMER");

  // 2. validate
  const parsed = createOfferSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Niepoprawne dane" };
  }

  const documents = parseOfferDocuments(formData.get("documents"));
  if (!documents.success) {
    return {
      ok: false,
      error: documents.error.issues[0]?.message ?? "Niepoprawne dokumenty",
    };
  }

  const photos = parseOfferPhotos(formData.get("photos"));
  if (!photos.success) {
    return {
      ok: false,
      error: photos.error.issues[0]?.message ?? "Niepoprawne zdjęcia",
    };
  }

  const input = parsed.data;

  // 3. mutate — listing is free; only the optional highlight is billed, and
  //    the offer plus its charge are written together.
  await prisma.$transaction(async (tx) => {
    const pickupLocationId = await resolvePickupLocationId(tx, {
      farmerId: user.id,
      companyId: user.companyId,
      city: input.city,
      postalCode: input.postalCode,
    });

    const offer = await tx.grainOffer.create({
      data: {
        reference: `OF-${Date.now().toString(36).toUpperCase()}`,
        grainType: input.grainType,
        harvestYear: input.harvestYear,
        tonnage: input.tonnage,
        pricePerTonne: input.pricePerTonne,
        status: "ACTIVE",
        title: input.title || null,
        // First picture is the lead image; its small copy drives the board.
        photoUrls: photos.data.map((photo) => photo.url),
        thumbnailUrl: photos.data[0]?.thumbnailUrl ?? null,
        isHighlighted: input.isHighlighted,
        highlightedAt: input.isHighlighted ? new Date() : null,
        highlightFeeNet: input.isHighlighted
          ? PRICING.offerHighlightNet
          : null,
        // Mock storage: only metadata is kept, `url` is a placeholder.
        documents: {
          create: documents.data.map((doc) => ({
            scope: "OFFER" as const,
            kind: doc.kind,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            url: mockStorageUrl(doc.fileName),
            issuedAt: new Date(),
          })),
        },
        farmer: { connect: { id: user.id } },
        pickupLocation: { connect: { id: pickupLocationId } },
      },
    });

    if (input.isHighlighted) {
      await tx.platformCharge.create({
        data: {
          kind: "OFFER_HIGHLIGHT",
          userId: user.id,
          offerId: offer.id,
          amountNet: PRICING.offerHighlightNet,
          description: "Wyróżnienie oferty na giełdzie (symulacja)",
        },
      });
    }
  });

  // 4. revalidate every board this offer now appears on
  revalidatePath("/farmer");
  revalidatePath("/buyer");
  revalidatePath("/admin");

  return { ok: true };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Reuse the farm's existing pickup point when the farmer lists another lot
 * from the same place, and only create a row when there is genuinely a new
 * one.
 *
 * Two reasons this matters beyond tidiness. A fresh `Location` per offer
 * duplicated the same yard on every listing, and a freshly created row has no
 * coordinates — which is what left generated haulage jobs with no distance
 * and a flat freight rate. Matching an existing location inherits whatever
 * coordinates it already carries.
 */
async function resolvePickupLocationId(
  tx: Tx,
  args: {
    farmerId: string;
    companyId: string | null;
    city: string;
    postalCode: string;
  },
) {
  const sameSpot = {
    city: args.city,
    postalCode: args.postalCode,
  };

  // Prefer a location the farm already owns; otherwise one this farmer has
  // shipped from before, which covers accounts with no company attached.
  const existing = await tx.location.findFirst({
    where: args.companyId
      ? { ...sameSpot, companyId: args.companyId }
      : { ...sameSpot, offersPickup: { some: { farmerId: args.farmerId } } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing.id;

  const created = await tx.location.create({
    data: {
      kind: LocationKind.FARM,
      ...sameSpot,
      companyId: args.companyId,
    },
    select: { id: true },
  });

  return created.id;
}
