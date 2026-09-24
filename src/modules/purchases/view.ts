import { reservationDeadline } from "@/lib/domain";
import {
  formatDate,
  formatDateTime,
  formatPln,
  formatTonnes,
  GRAIN_LABELS,
  JOB_STATUS_LABELS,
  PURCHASE_STATUS_LABELS,
} from "@/lib/format";
import type { PurchaseDto } from "@/modules/purchases/queries";
import type { RatingMap, RatingSummary } from "@/modules/reviews/queries";
import { isPurchaseReviewable } from "@/modules/reviews/reviewable";

export type PurchaseRowVm = {
  id: string;
  reference: string;
  grainLabel: string;
  status: string;
  statusLabel: string;
  jobStatus: string | null;
  jobStatusLabel: string | null;
  carrierName: string | null;
  tonnage: string;
  pricePerTonne: string;
  totalNet: string;
  deliveryCity: string;
  farmerId: string;
  farmerName: string | null;
  farmerRating: RatingSummary | null;
  buyerId: string;
  buyerName: string | null;
  buyerLogoUrl: string | null;
  buyerRating: RatingSummary | null;
  reviewable: boolean;
  /** Set while the sale is agreed: the delivery deadline. */
  deliverByLabel: string | null;
  /** Set while it is only a reservation: how long the farmer has to answer. */
  respondByLabel: string | null;
};

export function toPurchaseRow(
  purchase: PurchaseDto,
  ratings: RatingMap,
): PurchaseRowVm {
  return {
    id: purchase.id,
    reference: purchase.reference,
    grainLabel: GRAIN_LABELS[purchase.grainType],
    status: purchase.status,
    statusLabel: PURCHASE_STATUS_LABELS[purchase.status],
    jobStatus: purchase.jobStatus,
    jobStatusLabel: purchase.jobStatus
      ? JOB_STATUS_LABELS[purchase.jobStatus]
      : null,
    carrierName: purchase.carrierName,
    tonnage: formatTonnes(purchase.tonnage),
    pricePerTonne: formatPln(purchase.pricePerTonne),
    totalNet: formatPln(purchase.totalNet),
    deliveryCity: purchase.deliveryCity,
    farmerId: purchase.farmerId,
    farmerName: purchase.farmerName,
    farmerRating: ratings[purchase.farmerId] ?? null,
    buyerId: purchase.buyerId,
    buyerName: purchase.buyerName,
    buyerLogoUrl: purchase.buyerLogoUrl,
    buyerRating: ratings[purchase.buyerId] ?? null,
    reviewable: isPurchaseReviewable(purchase.status),
    deliverByLabel: purchase.expectedDeliveryAt
      ? formatDate(purchase.expectedDeliveryAt)
      : null,
    // The reservation window, not the delivery window: past this the lot goes
    // back on the board, so the label has to match what actually happens.
    respondByLabel:
      purchase.status === "PENDING"
        ? formatDateTime(reservationDeadline(purchase.createdAt))
        : null,
  };
}
