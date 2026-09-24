"use client";

import { BadgeCheck, Truck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { plural } from "@/lib/format";
import { BrandAvatar } from "@/modules/images/components/brand-avatar";
import { RatingBadge } from "@/modules/reviews/components/rating-badge";
import {
  approveCarrier,
  rejectCarrier,
} from "@/modules/transport/actions/carrier-decision";
import type { JobRowVm } from "@/modules/transport/view";

/**
 * The buyer picks who hauls their grain. Until this exists a carrier could
 * assign themselves to a load and drive to the farmer's yard with nobody
 * having agreed to it.
 */
export function CarrierApprovals({ rows }: { rows: JobRowVm[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = (jobId: string, approve: boolean) => {
    setBusyId(jobId);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("jobId", jobId);
      const result = approve
        ? await approveCarrier(null, formData)
        : await rejectCarrier(null, formData);

      if (result.ok) {
        toast.success(
          approve
            ? "Przewoźnik zaakceptowany — ładunek w trasie"
            : "Przewoźnik odrzucony — kurs wrócił na giełdę",
        );
      } else {
        toast.error(result.error);
      }
      setBusyId(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Przewoźnicy do akceptacji</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Nikt nie czeka na Twoją decyzję."
            : `${rows.length} ${plural(rows.length, ["przewoźnik czeka", "przewoźników czeka", "przewoźników czeka"])} na Twoją zgodę. Bez niej nikt nie pojedzie po towar.`}
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Brak zgłoszeń"
          description="Gdy przewoźnik zgłosi się po Twój ładunek, zobaczysz go tutaj razem z jego licencjami i ocenami."
        />
      ) : (
        <CardContent className="grid gap-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg leading-tight font-semibold">
                    {row.fromCity} → {row.toCity}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {row.grainLabel} · {row.tonnage} · {row.distance}
                  </p>
                </div>
                <p className="shrink-0 text-right text-lg font-semibold tabular-nums">
                  {row.totalNet}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
                <BrandAvatar
                  logoUrl={row.carrierLogoUrl}
                  image={null}
                  name={row.carrierName}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.carrierName}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <RatingBadge
                      avg={row.carrierRating?.avg}
                      count={row.carrierRating?.count}
                    />
                    {row.carrierDocumentCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <BadgeCheck className="size-4" />
                        {row.carrierDocumentCount}{" "}
                        {plural(row.carrierDocumentCount, [
                          "dokument",
                          "dokumenty",
                          "dokumentów",
                        ])}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        brak licencji na koncie
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  disabled={pending && busyId === row.id}
                  onClick={() => decide(row.id, true)}
                  className="sm:flex-1"
                >
                  Akceptuj przewoźnika
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending && busyId === row.id}
                  onClick={() => decide(row.id, false)}
                  className="sm:flex-1"
                >
                  Odrzuć
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
