"use client";

import { ShoppingCart } from "lucide-react";

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
import { CancelReservationButton } from "@/modules/purchases/components/cancel-reservation-button";
import type { PurchaseRowVm } from "@/modules/purchases/view";
import { RatingBadge } from "@/modules/reviews/components/rating-badge";
import {
  PURCHASE_NOT_REVIEWABLE_REASON,
  reviewKey,
} from "@/modules/reviews/reviewable";
import { ReviewForm } from "@/modules/reviews/components/review-form";

type Props = {
  rows: PurchaseRowVm[];
  reviewedPurchases: Record<string, number>;
};

export function PurchaseList({ rows, reviewedPurchases }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Moje zakupy</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Nic jeszcze nie kupiłeś."
            : `${rows.length} ${plural(rows.length, ["transakcja", "transakcje", "transakcji"])}.`}
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Brak zakupów"
          description="Kupione partie pojawią się tutaj razem ze statusem transportu."
        />
      ) : (
        <>
          <CardContent className="grid gap-3 lg:hidden">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg leading-tight font-semibold">
                      {row.grainLabel}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {row.tonnage} · {row.pricePerTonne}/t
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-xl font-semibold tabular-nums">
                    {row.totalNet}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={row.status} label={row.statusLabel} />
                  {row.jobStatus && row.jobStatusLabel && (
                    <StatusBadge
                      status={row.jobStatus}
                      label={`Transport: ${row.jobStatusLabel}`}
                    />
                  )}
                </div>

                <div className="mt-3 space-y-2 border-t pt-3 text-sm">
                  <p className="text-muted-foreground">
                    Dostawa do: {row.deliveryCity}
                    {row.deliverByLabel
                      ? ` · termin ${row.deliverByLabel}`
                      : ""}
                  </p>
                  {row.respondByLabel && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-muted-foreground">
                        Rolnik ma czas na odpowiedź do {row.respondByLabel}.
                      </p>
                      <CancelReservationButton
                        purchaseId={row.id}
                        grainLabel={row.grainLabel}
                        tonnage={row.tonnage}
                        totalNet={row.totalNet}
                        reference={row.reference}
                        farmerName={row.farmerName}
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Sprzedający:</span>
                      <span>{row.farmerName}</span>
                      <RatingBadge
                        avg={row.farmerRating?.avg}
                        count={row.farmerRating?.count}
                      />
                    </span>
                    {row.reviewable ? (
                      <ReviewForm
                        scope="TRADE"
                        purchaseId={row.id}
                        subjectId={row.farmerId}
                        subjectName={row.farmerName}
                        existingRating={reviewedPurchases[reviewKey(row.id, row.farmerId)]}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {PURCHASE_NOT_REVIEWABLE_REASON}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.reference}
                  </p>
                </div>
              </article>
            ))}
          </CardContent>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zboże</TableHead>
                  <TableHead>Sprzedający</TableHead>
                  <TableHead className="text-right">Tonaż</TableHead>
                  <TableHead className="text-right">Wartość netto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Ocena sprzedającego</TableHead>
                  <TableHead className="text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.grainLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.reference}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{row.farmerName}</p>
                      <RatingBadge
                        avg={row.farmerRating?.avg}
                        count={row.farmerRating?.count}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.tonnage}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.totalNet}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} label={row.statusLabel} />
                    </TableCell>
                    <TableCell>
                      {row.jobStatus && row.jobStatusLabel ? (
                        <StatusBadge
                          status={row.jobStatus}
                          label={row.jobStatusLabel}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Only reviewable because this buyer is a party to
                          this exact purchase. */}
                      {row.reviewable ? (
                        <ReviewForm
                          scope="TRADE"
                          purchaseId={row.id}
                          subjectId={row.farmerId}
                          subjectName={row.farmerName}
                          existingRating={reviewedPurchases[reviewKey(row.id, row.farmerId)]}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {PURCHASE_NOT_REVIEWABLE_REASON}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Only while it is still just a reservation: after the
                          farmer confirms, neither side leaves alone. */}
                      {row.respondByLabel ? (
                        <CancelReservationButton
                          purchaseId={row.id}
                          grainLabel={row.grainLabel}
                          tonnage={row.tonnage}
                          totalNet={row.totalNet}
                          reference={row.reference}
                          farmerName={row.farmerName}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
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
