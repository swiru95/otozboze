"use client";

import { Handshake } from "lucide-react";
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
import {
  confirmPurchase,
  rejectPurchase,
} from "@/modules/purchases/actions/confirm-purchase";
import type { PurchaseRowVm } from "@/modules/purchases/view";
import { RatingBadge } from "@/modules/reviews/components/rating-badge";

/**
 * A buyer reserving a lot does not bind the farmer any more. The farmer sees
 * who wants it and on what terms, and decides.
 */
export function ReservationApprovals({ rows }: { rows: PurchaseRowVm[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = (purchaseId: string, confirm: boolean) => {
    setBusyId(purchaseId);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("purchaseId", purchaseId);
      const result = confirm
        ? await confirmPurchase(null, formData)
        : await rejectPurchase(null, formData);

      if (result.ok) {
        toast.success(
          confirm
            ? "Sprzedaż potwierdzona — zlecenie transportu utworzone"
            : "Rezerwacja odrzucona — oferta wróciła na giełdę",
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
        <CardTitle className="text-lg">Rezerwacje do potwierdzenia</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Nikt nie czeka na Twoją decyzję."
            : `${rows.length} ${plural(rows.length, ["kupujący czeka", "kupujących czeka", "kupujących czeka"])} na Twoje potwierdzenie. Do tego czasu partia jest zdjęta z giełdy.`}
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Brak rezerwacji"
          description="Gdy kupujący zarezerwuje Twoją partię, zobaczysz tutaj jego dane i warunki do zaakceptowania."
        />
      ) : (
        <CardContent className="grid gap-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg leading-tight font-semibold">
                    {row.grainLabel}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {row.tonnage} · {row.pricePerTonne}/t · dostawa do{" "}
                    {row.deliveryCity}
                  </p>
                </div>
                <p className="shrink-0 text-right text-xl font-semibold tabular-nums">
                  {row.totalNet}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
                <BrandAvatar
                  logoUrl={row.buyerLogoUrl}
                  image={null}
                  name={row.buyerName}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.buyerName}</p>
                  <RatingBadge
                    avg={row.buyerRating?.avg}
                    count={row.buyerRating?.count}
                  />
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {row.reference}
                </p>
              </div>

              {row.respondByLabel && (
                <p className="mt-3 text-sm font-medium">
                  Odpowiedz do {row.respondByLabel}.
                </p>
              )}

              <p className="mt-2 text-sm text-muted-foreground">
                Po potwierdzeniu partia trafi jako sprzedana, a zlecenie
                transportu pojawi się na giełdzie frachtowej. Zapłata idzie
                Waszym kanałem, poza platformą.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  disabled={pending && busyId === row.id}
                  onClick={() => decide(row.id, true)}
                  className="sm:flex-1"
                >
                  Potwierdź sprzedaż
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
