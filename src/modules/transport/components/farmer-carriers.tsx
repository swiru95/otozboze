"use client";

import { Truck } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { plural } from "@/lib/format";
import { RatingBadge } from "@/modules/reviews/components/rating-badge";
import { ReviewForm } from "@/modules/reviews/components/review-form";
import {
  JOB_NOT_REVIEWABLE_REASON,
  reviewKey,
} from "@/modules/reviews/reviewable";
import type { JobRowVm } from "@/modules/transport/view";

type Props = {
  rows: JobRowVm[];
  reviewedJobs: Record<string, number>;
};

/**
 * The farmer's side of haulage: who came for the grain, and how it went.
 *
 * The farmer is a party to every run that leaves their yard, so the review
 * rules already allow them to rate the carrier. This is the screen that lets
 * them — without it, reputation on the transport side was built from the
 * buyer's view alone.
 */
export function FarmerCarriers({ rows, reviewedJobs }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Przewoźnicy moich partii</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Nikt jeszcze nie przyjechał po Twoje zboże."
            : `${rows.length} ${plural(rows.length, ["kurs", "kursy", "kursów"])} z Twojego gospodarstwa. Oceń kierowcę — inni rolnicy to zobaczą.`}
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Brak kursów"
          description="Kursy pojawią się tutaj, gdy przewoźnik zgłosi się po potwierdzoną partię."
        />
      ) : (
        <CardContent className="grid gap-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="leading-tight font-semibold">
                    {row.fromCity} → {row.toCity}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {row.grainLabel} · {row.tonnage} · {row.distance}
                  </p>
                </div>
                <StatusBadge status={row.status} label={row.statusLabel} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Przewoźnik:</span>
                  <span>{row.carrierName}</span>
                  <RatingBadge
                    avg={row.carrierRating?.avg}
                    count={row.carrierRating?.count}
                  />
                </span>
                {row.reviewable && row.carrierId ? (
                  <ReviewForm
                    scope="TRANSPORT"
                    transportJobId={row.id}
                    subjectId={row.carrierId}
                    subjectName={row.carrierName}
                    existingRating={
                      row.carrierId
                        ? reviewedJobs[reviewKey(row.id, row.carrierId)]
                        : undefined
                    }
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {JOB_NOT_REVIEWABLE_REASON}
                  </span>
                )}
              </div>
            </article>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
