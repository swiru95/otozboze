import {
  formatPln,
  formatTonnes,
  GRAIN_LABELS,
  OFFER_STATUS_LABELS,
} from "@/lib/format";
import type { OfferDto } from "@/modules/offers/queries";
import {
  hasValidDocuments,
  toDocumentRow,
  type DocumentVm,
} from "@/modules/documents/view";
import type { RatingMap, RatingSummary } from "@/modules/reviews/queries";
import { isPurchaseReviewable } from "@/modules/reviews/reviewable";

/**
 * Money and dates are formatted here, on the server, and the raw numbers are
 * carried alongside for client-side sorting. Formatting in a client component
 * risks an ICU mismatch between Node and the browser.
 */
export type OfferRowVm = {
  id: string;
  reference: string;
  grainType: string;
  grainLabel: string;
  harvestYear: number;
  status: string;
  statusLabel: string;
  isHighlighted: boolean;
  thumbnailUrl: string | null;
  photoUrls: string[];
  /** Alt text is generated, since a plain string array cannot carry it. */
  photoAlt: string;
  documents: DocumentVm[];
  /** At least one attachment that has not expired — drives the board badge. */
  hasDocuments: boolean;
  hasCertificate: boolean;
  tonnage: string;
  pricePerTonne: string;
  totalNet: string;
  tonnageNum: number;
  priceNum: number;
  totalNum: number;
  createdAtMs: number;
  farmerId: string;
  farmerName: string | null;
  farmerRating: RatingSummary | null;
  buyerId: string | null;
  buyerName: string | null;
  buyerRating: RatingSummary | null;
  purchaseId: string | null;
  /** Reviewing the buyer only makes sense once the sale took effect. */
  purchaseReviewable: boolean;
  city: string;
  postalCode: string;
  voivodeship: string | null;
  location: string;
  own: boolean;
};

export function toOfferRow(
  offer: OfferDto,
  ratings: RatingMap,
  currentUserId: string,
): OfferRowVm {
  const documents = offer.documents.map((doc) => toDocumentRow(doc));

  return {
    id: offer.id,
    reference: offer.reference,
    grainType: offer.grainType,
    grainLabel: GRAIN_LABELS[offer.grainType],
    harvestYear: offer.harvestYear,
    status: offer.status,
    statusLabel: OFFER_STATUS_LABELS[offer.status],
    isHighlighted: offer.isHighlighted,
    thumbnailUrl: offer.thumbnailUrl,
    photoUrls: offer.photoUrls,
    photoAlt: `${GRAIN_LABELS[offer.grainType]}, zbiór ${offer.harvestYear}`,
    documents,
    hasDocuments: hasValidDocuments(documents),
    hasCertificate: documents.some(
      (doc) => doc.isCertificate && !doc.isExpired,
    ),
    tonnage: formatTonnes(offer.tonnage),
    pricePerTonne: formatPln(offer.pricePerTonne),
    totalNet: formatPln(offer.totalNet),
    tonnageNum: Number(offer.tonnage),
    priceNum: Number(offer.pricePerTonne),
    totalNum: Number(offer.totalNet),
    createdAtMs: offer.createdAt.getTime(),
    farmerId: offer.farmerId,
    farmerName: offer.farmerName,
    farmerRating: ratings[offer.farmerId] ?? null,
    buyerId: offer.buyerId,
    buyerName: offer.buyerName,
    buyerRating: offer.buyerId ? (ratings[offer.buyerId] ?? null) : null,
    purchaseId: offer.purchaseId,
    purchaseReviewable: offer.purchaseStatus
      ? isPurchaseReviewable(offer.purchaseStatus)
      : false,
    city: offer.city,
    postalCode: offer.postalCode,
    voivodeship: offer.voivodeship,
    location: `${offer.postalCode} ${offer.city}`,
    own: offer.farmerId === currentUserId,
  };
}
