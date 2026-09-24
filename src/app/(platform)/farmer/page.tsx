import { after } from "next/server";

import { requireCapability } from "@/lib/auth/capabilities";
import { FarmerOffers } from "@/modules/offers/components/farmer-offers";
import { OfferForm } from "@/modules/offers/components/offer-form";
import { listOffersByFarmer } from "@/modules/offers/queries";
import { ReservationApprovals } from "@/modules/purchases/components/reservation-approvals";
import { expireStaleReservations } from "@/modules/purchases/expire";
import { listReservationsForFarmer } from "@/modules/purchases/queries";
import { toPurchaseRow } from "@/modules/purchases/view";
import { toOfferRow } from "@/modules/offers/view";
import {
  getRatingSummaries,
  getReviewsWrittenBy,
} from "@/modules/reviews/queries";
import { FarmerCarriers } from "@/modules/transport/components/farmer-carriers";
import { listJobsForFarmer } from "@/modules/transport/queries";
import { toJobRow } from "@/modules/transport/view";

export default async function FarmerPage() {
  const user = await requireCapability("FARMER");

  // Housekeeping, after the response: reservations nobody answered go back on
  // the board. Until there is a scheduler, page traffic is the trigger.
  after(expireStaleReservations);

  const [offers, written, reservations, jobs] = await Promise.all([
    listOffersByFarmer(user.id),
    getReviewsWrittenBy(user.id),
    listReservationsForFarmer(user.id),
    listJobsForFarmer(user.id),
  ]);

  const ratings = await getRatingSummaries([
    ...new Set([
      ...offers.map((o) => o.buyerId).filter((id) => id !== null),
      ...reservations.map((r) => r.buyerId),
      ...jobs.map((j) => j.carrierId).filter((id) => id !== null),
    ]),
  ]);

  const rows = offers.map((offer) => toOfferRow(offer, ratings, user.id));

  return (
    <div className="space-y-6">
      {/* Decisions first: somebody is waiting on this farmer. */}
      {reservations.length > 0 && (
        <ReservationApprovals
          rows={reservations.map((row) => toPurchaseRow(row, ratings))}
        />
      )}

      {jobs.length > 0 && (
        <FarmerCarriers
          rows={jobs.map((job) => toJobRow(job, ratings))}
          reviewedJobs={Object.fromEntries(written.byJob)}
        />
      )}

      {/* On a phone the list comes first; the form is one tap away below it. */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:items-start">
      <div className="order-2 lg:order-1 lg:sticky lg:top-24">
        <OfferForm />
      </div>
      <div className="order-1 lg:order-2">
        <FarmerOffers
            rows={rows}
            reviewedPurchases={Object.fromEntries(written.byPurchase)}
          />
        </div>
      </div>
    </div>
  );
}
