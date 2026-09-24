"use client";

import { Wheat } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { Button } from "@/components/ui/button";
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
import { OfferPhotosDialog } from "@/modules/images/components/offer-photos-dialog";
import { OfferThumbnail } from "@/modules/images/components/offer-thumbnail";
import { WithdrawButton } from "@/modules/offers/components/withdraw-button";
import type { OfferRowVm } from "@/modules/offers/view";
import { RatingBadge } from "@/modules/reviews/components/rating-badge";
import { ReviewForm } from "@/modules/reviews/components/review-form";
import {
  PURCHASE_NOT_REVIEWABLE_REASON,
  reviewKey,
} from "@/modules/reviews/reviewable";

type Props = {
  rows: OfferRowVm[];
  /** purchaseId -> rating already written by this farmer. */
  reviewedPurchases: Record<string, number>;
};

export function FarmerOffers({ rows, reviewedPurchases }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Moje oferty</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Jeszcze nic nie wystawiłeś."
            : `${rows.length} ${plural(rows.length, ["partia", "partie", "partii"])} na Twoim koncie.`}
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="Brak ofert"
          description="Wystaw pierwszą partię zboża — trafi na giełdę od razu i zobaczą ją wszyscy kupujący."
          action={
            <Button asChild>
              <a href="#nowa-oferta">Wystaw zboże</a>
            </Button>
          }
        />
      ) : (
        <>
          <CardContent className="grid gap-3 lg:hidden">
            {rows.map((row) => (
              <article key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <OfferThumbnail src={row.thumbnailUrl} alt={row.photoAlt} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg leading-tight font-semibold">
                      {row.grainLabel}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      zbiór {row.harvestYear}
                    </p>
                  </div>
                </div>

                {/* Status siedzi w osobnej linii, a nie obok tytułu. Plakietka
                    ma stałą wysokość i nie zawija tekstu, więc najdłuższa
                    etykieta ("Zarezerwowana — czeka na Ciebie") nie zmieściłaby
                    się obok miniatury i rozpychała całą stronę w poziomie na
                    telefonie. */}
                <div className="mt-2">
                  <StatusBadge status={row.status} label={row.statusLabel} />
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">Tonaż</dt>
                    <dd className="font-semibold tabular-nums">{row.tonnage}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Cena/t</dt>
                    <dd className="font-semibold tabular-nums">
                      {row.pricePerTonne}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Netto</dt>
                    <dd className="font-semibold tabular-nums">{row.totalNet}</dd>
                  </div>
                </dl>

                <div className="mt-3 space-y-2 border-t pt-3 text-sm">
                  <p className="text-muted-foreground">{row.location}</p>
                  {row.buyerName ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">Kupujący:</span>
                        <span>{row.buyerName}</span>
                        <RatingBadge
                          avg={row.buyerRating?.avg}
                          count={row.buyerRating?.count}
                        />
                      </span>
                      {row.purchaseId &&
                        row.buyerId &&
                        (row.purchaseReviewable ? (
                          <ReviewForm
                            scope="TRADE"
                            purchaseId={row.purchaseId}
                            subjectId={row.buyerId}
                            subjectName={row.buyerName}
                            existingRating={reviewedPurchases[reviewKey(row.purchaseId, row.buyerId)]}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {PURCHASE_NOT_REVIEWABLE_REASON}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Czeka na kupującego.
                    </p>
                  )}
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.reference}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <OfferPhotosDialog
                      photos={row.photoUrls}
                      grainLabel={row.grainLabel}
                      reference={row.reference}
                    />
                    {row.status === "ACTIVE" && (
                      <WithdrawButton
                        offerId={row.id}
                        grainLabel={row.grainLabel}
                        tonnage={row.tonnage}
                        totalNet={row.totalNet}
                        reference={row.reference}
                      />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </CardContent>

          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">
                    <span className="sr-only">Zdjęcie</span>
                  </TableHead>
                  <TableHead>Zboże</TableHead>
                  <TableHead className="text-right">Tonaż</TableHead>
                  <TableHead className="text-right">Cena za tonę</TableHead>
                  <TableHead className="text-right">Wartość netto</TableHead>
                  <TableHead>Lokalizacja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kupujący</TableHead>
                  <TableHead>Ocena kupującego</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <OfferThumbnail
                        src={row.thumbnailUrl}
                        alt={row.photoAlt}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{row.grainLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        zbiór {row.harvestYear} · {row.reference}
                      </p>
                      {row.photoUrls.length > 0 && (
                        <div className="mt-1">
                          <OfferPhotosDialog
                            photos={row.photoUrls}
                            grainLabel={row.grainLabel}
                            reference={row.reference}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.tonnage}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.pricePerTonne}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.totalNet}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.location}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge
                          status={row.status}
                          label={row.statusLabel}
                        />
                        {row.status === "ACTIVE" && (
                          <WithdrawButton
                            offerId={row.id}
                            grainLabel={row.grainLabel}
                            tonnage={row.tonnage}
                            totalNet={row.totalNet}
                            reference={row.reference}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.buyerName ? (
                        <>
                          <p>{row.buyerName}</p>
                          <RatingBadge
                            avg={row.buyerRating?.avg}
                            count={row.buyerRating?.count}
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* The form only appears once a purchase exists, i.e.
                          once there is a transaction to anchor it to. */}
                      {row.purchaseId && row.buyerId ? (
                        row.purchaseReviewable ? (
                          <ReviewForm
                            scope="TRADE"
                            purchaseId={row.purchaseId}
                            subjectId={row.buyerId}
                            subjectName={row.buyerName}
                            existingRating={reviewedPurchases[reviewKey(row.purchaseId, row.buyerId)]}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {PURCHASE_NOT_REVIEWABLE_REASON}
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          brak transakcji
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
