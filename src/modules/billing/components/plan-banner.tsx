"use client";

import { Crown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPln } from "@/lib/format";
import { upgradeToPro } from "@/modules/billing/actions/upgrade-to-pro";
import { PaywallDialog } from "@/modules/billing/components/paywall-dialog";
import { PRICING } from "@/modules/billing/pricing";

type Props = {
  isPro: boolean;
  /** Pre-formatted on the server. */
  capNet: string;
  spentNet: string;
  remainingNet: string;
  usedPct: number;
  validUntil: string | null;
};

/** Plan state and, on the free tier, how much of the month's cap is left. */
export function PlanBanner({
  isPro,
  capNet,
  spentNet,
  remainingNet,
  usedPct,
  validUntil,
}: Props) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const upgrade = () =>
    startTransition(async () => {
      const result = await upgradeToPro();
      if (result.ok) toast.success("Plan PRO aktywny — limit zdjęty");
      else toast.error(result.error);
    });

  if (isPro) {
    return (
      <Card size="sm" className="ring-primary/30">
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
            <Crown className="size-4" />
            Plan PRO
          </span>
          <span className="text-sm text-muted-foreground">
            Bez limitu zakupów. W tym miesiącu kupiłeś za {spentNet}.
          </span>
          {validUntil && (
            <span className="text-sm text-muted-foreground">
              Ważny do {validUntil}.
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card size="sm">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2 lg:flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">Plan darmowy</span>
              <span className="text-sm text-muted-foreground">
                limit {capNet} netto na miesiąc
              </span>
            </p>

            {/* A meter makes "how much is left" readable at a glance. */}
            <div
              role="progressbar"
              aria-valuenow={usedPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Wykorzystany limit miesięczny"
              className="h-2 w-full overflow-hidden rounded-full bg-muted lg:max-w-md"
            >
              <div
                className={`h-full rounded-full ${usedPct >= 90 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.max(usedPct, 2)}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Wykorzystano {spentNet}. Zostało {remainingNet}.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
            <p className="text-sm">
              <span className="font-semibold">
                PRO {formatPln(PRICING.proMonthlyNet)}
              </span>
              <span className="text-muted-foreground"> netto / mies.</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaywallOpen(true)}
              >
                Co daje PRO?
              </Button>
              <Button size="sm" onClick={upgrade} disabled={pending}>
                {pending ? "Aktywuję…" : "Przejdź na PRO"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        remainingNet={remainingNet}
      />
    </>
  );
}
