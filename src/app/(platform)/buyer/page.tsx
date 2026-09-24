import { after } from "next/server";

import { requireCapability } from "@/lib/auth/capabilities";
import { formatDate, formatPln } from "@/lib/format";
import { PlanBanner } from "@/modules/billing/components/plan-banner";
import { getBuyerAllowance } from "@/modules/billing/queries";
import { GallerySection } from "@/modules/profile/components/gallery-section";
import { getProfileImages } from "@/modules/profile/queries";
import { OfferBoard } from "@/modules/offers/components/offer-board";
import { listActiveOffers } from "@/modules/offers/queries";
import { toOfferRow } from "@/modules/offers/view";
import { PurchaseList } from "@/modules/purchases/components/purchase-list";
import { expireStaleReservations } from "@/modules/purchases/expire";
import { listPurchasesByBuyer } from "@/modules/purchases/queries";
import { toPurchaseRow } from "@/modules/purchases/view";
import {
  getRatingSummaries,
  getReviewsWrittenBy,
} from "@/modules/reviews/queries";
import { CarrierApprovals } from "@/modules/transport/components/carrier-approvals";
import { listJobsAwaitingApproval } from "@/modules/transport/queries";
import { toJobRow } from "@/modules/transport/view";

export default async function BuyerPage() {
  const user = await requireCapability("BUYER");

  // See the farmer page: stale reservations are released after the response.
  after(expireStaleReservations);

  const [offers, purchases, written, allowance, awaiting] = await Promise.all([
    listActiveOffers(),
    listPurchasesByBuyer(user.id),
    getReviewsWrittenBy(user.id),
    getBuyerAllowance(user.id),
    listJobsAwaitingApproval(user.id),
  ]);

  const profile = await getProfileImages(user.id);

  const ratings = await getRatingSummaries([
    ...new Set([
      ...offers.map((o) => o.farmerId),
      ...purchases.map((p) => p.farmerId),
      ...awaiting.flatMap((j) => [j.farmerId, j.buyerId]),
      ...awaiting.map((j) => j.carrierId).filter((id) => id !== null),
    ]),
  ]);

  return (
    <div className="space-y-6">
      <PlanBanner
        isPro={allowance.isPro}
        capNet={formatPln(allowance.capNet)}
        spentNet={formatPln(allowance.spentNet)}
        remainingNet={formatPln(allowance.remainingNet)}
        usedPct={allowance.usedPct}
        validUntil={allowance.validUntil ? formatDate(allowance.validUntil) : null}
      />

      {awaiting.length > 0 && (
        <CarrierApprovals
          rows={awaiting.map((job) => toJobRow(job, ratings))}
        />
      )}

      <OfferBoard
        rows={offers.map((offer) => toOfferRow(offer, ratings, user.id))}
        allowance={{
          isPro: allowance.isPro,
          remainingNum: Number(allowance.remainingNet),
          remainingNet: formatPln(allowance.remainingNet),
        }}
      />

      <PurchaseList
        rows={purchases.map((purchase) => toPurchaseRow(purchase, ratings))}
        reviewedPurchases={Object.fromEntries(written.byPurchase)}
      />

      {/* Profile last: trading comes before decorating the account. */}
      <GallerySection
        images={profile.galleryUrls}
        title="Magazyny i silosy"
        description="Zdjęcia bazy przekonują rolników, że jest dokąd dowieźć towar."
        altPrefix="Zdjęcie magazynu"
      />
    </div>
  );
}
