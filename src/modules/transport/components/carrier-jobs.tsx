"use client";

import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
 * Who the carrier faces on this run. The buyer commissioned it and the farmer
 * loaded it, and the eligibility rules let the carrier rate each of them once.
 * A carrier hauling their own load is filtered out — nobody reviews themselves.
 */
function counterparties(row: JobRowVm) {
  return [
    {
      id: row.buyerId,
      name: row.buyerName,
      label: "Zleceniodawca",
      rating: row.buyerRating,
    },
    {
      id: row.farmerId,
      name: row.farmerName,
      label: "Załadunek",
      rating: row.farmerRating,
    },
  ].filter((party) => party.id !== row.carrierId);
}

export function CarrierJobs({ rows, reviewedJobs }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Moje kursy</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Nie przyjąłeś jeszcze żadnego zlecenia."
            : `${rows.length} ${plural(rows.length, ["kurs", "kursy", "kursów"])} na Twoim koncie.`}
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Brak kursów"
          description="Weź zlecenie z giełdy frachtowej powyżej — pojawi się tutaj razem ze statusem."
        />
      ) : (
        <>
          <CardContent className="grid gap-3 lg:hidden">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg leading-tight font-semibold">
                      {row.fromCity} → {row.toCity}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {row.grainLabel} · {row.tonnage} · {row.distance}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-xl font-semibold tabular-nums">
                    {row.totalNet}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={row.status} label={row.statusLabel} />
                  {row.deliverByLabel && (
                    <span className="text-sm text-muted-foreground">
                      dostawa do {row.deliverByLabel}
                    </span>
                  )}
                </div>

                {/* A run has two counterparties: whoever commissioned it and
                    whoever loaded the truck. Both are reviewable, separately. */}
                {counterparties(row).map((party) => (
                  <div
                    key={party.id}
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">
                        {party.label}:
                      </span>
                      <span>{party.name}</span>
                      <RatingBadge
                        avg={party.rating?.avg}
                        count={party.rating?.count}
                      />
                    </span>
                    {row.reviewable ? (
                      <ReviewForm
                        scope="TRANSPORT"
                        transportJobId={row.id}
                        subjectId={party.id}
                        subjectName={party.name}
                        existingRating={reviewedJobs[reviewKey(row.id, party.id)]}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {JOB_NOT_REVIEWABLE_REASON}
                      </span>
                    )}
                  </div>
                ))}
              </article>
            ))}
          </CardContent>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trasa</TableHead>
                  <TableHead>Ładunek</TableHead>
                  <TableHead className="text-right">Tonaż</TableHead>
                  <TableHead className="text-right">Zarobek netto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kontrahenci</TableHead>
                  <TableHead>Ocena</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">
                        {row.fromCity} → {row.toCity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {row.reference}
                      </p>
                    </TableCell>
                    <TableCell>{row.grainLabel}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.tonnage}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.totalNet}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} label={row.statusLabel} />
                    </TableCell>
                    <TableCell className="space-y-1">
                      {counterparties(row).map((party) => (
                        <p key={party.id} className="flex items-center gap-2">
                          <span>{party.name}</span>
                          <RatingBadge
                            avg={party.rating?.avg}
                            count={party.rating?.count}
                          />
                        </p>
                      ))}
                    </TableCell>
                    <TableCell className="space-y-1">
                      {/* Anchored to this haulage job, which this carrier
                          actually accepted — one review per counterparty. */}
                      {row.reviewable ? (
                        counterparties(row).map((party) => (
                          <ReviewForm
                            key={party.id}
                            scope="TRANSPORT"
                            transportJobId={row.id}
                            subjectId={party.id}
                            subjectName={party.name}
                            existingRating={
                              reviewedJobs[reviewKey(row.id, party.id)]
                            }
                          />
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {JOB_NOT_REVIEWABLE_REASON}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}
