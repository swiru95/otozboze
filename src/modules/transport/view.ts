import { Prisma } from "@/generated/prisma/client";
import {
  formatDate,
  formatDayMonth,
  formatPln,
  formatTonnes,
  GRAIN_LABELS,
  JOB_STATUS_LABELS,
} from "@/lib/format";
import { PRICING } from "@/modules/billing/pricing";
import type { RatingMap, RatingSummary } from "@/modules/reviews/queries";
import { isJobReviewable } from "@/modules/reviews/reviewable";
import type { TransportJobDto } from "@/modules/transport/queries";

export type JobRowVm = {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  grainType: string;
  grainLabel: string;
  route: string;
  fromCity: string;
  toCity: string;
  fromPostalCode: string;
  toPostalCode: string;
  voivodeship: string | null;
  distance: string;
  distanceNum: number;
  tonnage: string;
  tonnageNum: number;
  ratePerTonne: string;
  totalNet: string;
  /** Job value minus the flat platform commission. */
  netAfterFee: string;
  totalNum: number;
  pickupWindow: string;
  createdAtMs: number;
  buyerId: string;
  buyerName: string | null;
  buyerRating: RatingSummary | null;
  /** The other side of the run: whoever loads the truck. Reviewable too. */
  farmerId: string;
  farmerName: string | null;
  farmerRating: RatingSummary | null;
  carrierId: string | null;
  carrierName: string | null;
  carrierLogoUrl: string | null;
  carrierDocumentCount: number;
  carrierRating: RatingSummary | null;
  reviewable: boolean;
  deliverByLabel: string | null;
};

export function toJobRow(job: TransportJobDto, ratings: RatingMap): JobRowVm {
  const pickupWindow = job.pickupFrom
    ? job.pickupTo
      ? `${formatDayMonth(job.pickupFrom)} – ${formatDayMonth(job.pickupTo)}`
      : `od ${formatDayMonth(job.pickupFrom)}`
    : "do uzgodnienia";

  // The carrier compares take-home pay, so the fee is subtracted here, in
  // Decimal, and only then formatted.
  const netAfterFee = job.totalNet
    ? formatPln(
        new Prisma.Decimal(job.totalNet)
          .minus(PRICING.transportCommissionNet)
          .toString(),
      )
    : "—";

  return {
    id: job.id,
    reference: job.reference,
    status: job.status,
    statusLabel: JOB_STATUS_LABELS[job.status],
    grainType: job.grainType,
    grainLabel: GRAIN_LABELS[job.grainType],
    route: `${job.fromCity} → ${job.toCity}`,
    fromCity: job.fromCity,
    toCity: job.toCity,
    fromPostalCode: job.fromPostalCode,
    toPostalCode: job.toPostalCode,
    voivodeship: job.fromVoivodeship,
    distance: job.distanceKm ? `${job.distanceKm} km` : "—",
    // Unknown distance sorts last rather than first.
    distanceNum: job.distanceKm ?? Number.MAX_SAFE_INTEGER,
    tonnage: formatTonnes(job.tonnage),
    tonnageNum: Number(job.tonnage),
    ratePerTonne: job.ratePerTonne ? formatPln(job.ratePerTonne) : "—",
    totalNet: job.totalNet ? formatPln(job.totalNet) : "—",
    netAfterFee,
    totalNum: Number(job.totalNet ?? 0),
    pickupWindow,
    createdAtMs: job.createdAt.getTime(),
    buyerId: job.buyerId,
    buyerName: job.buyerName,
    buyerRating: ratings[job.buyerId] ?? null,
    farmerId: job.farmerId,
    farmerName: job.farmerName,
    farmerRating: ratings[job.farmerId] ?? null,
    carrierId: job.carrierId,
    carrierName: job.carrierName,
    carrierLogoUrl: job.carrierLogoUrl,
    carrierDocumentCount: job.carrierDocumentCount,
    carrierRating: job.carrierId ? (ratings[job.carrierId] ?? null) : null,
    reviewable: isJobReviewable(job.status, job.carrierId),
    deliverByLabel: job.deliverBy ? formatDate(job.deliverBy) : null,
  };
}
