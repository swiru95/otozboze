"use client";

import { Crown } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SummaryList } from "@/components/layout/summary-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaywallDialog } from "@/modules/billing/components/paywall-dialog";
import { buyOffer } from "@/modules/purchases/actions/buy-offer";

type Props = {
  offerId: string;
  /** Pre-formatted on the server — Decimal never crosses this boundary. */
  grainLabel: string;
  tonnage: string;
  pricePerTonne: string;
  totalNet: string;
  farmerName: string | null;
  location: string;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  size?: "sm" | "default";
  /** Free-tier ceiling would be exceeded by this purchase. */
  blockedByCap?: boolean;
  /** Formatted allowance left this month, shown in the paywall. */
  remainingNet: string;
};

export function BuyButton({
  offerId,
  grainLabel,
  tonnage,
  pricePerTonne,
  totalNet,
  farmerName,
  location,
  disabled,
  disabledReason,
  className,
  size = "sm",
  blockedByCap = false,
  remainingNet,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // The result is handled here rather than in an effect, so closing the dialog
  // is an event, not a cascading render.
  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await buyOffer(null, formData);
      if (result.ok) {
        toast.success("Zarezerwowane. Czekasz na potwierdzenie rolnika.");
        setConfirmOpen(false);
        return;
      }
      // The server owns the ceiling; this catches the case where the
      // allowance ran out between render and submit.
      if (result.reason === "FREE_TIER_CAP") {
        setConfirmOpen(false);
        setPaywallOpen(true);
        return;
      }
      toast.error(result.error);
    });

  if (disabled) {
    return (
      <span className="text-sm text-muted-foreground">{disabledReason}</span>
    );
  }

  return (
    <>
      <Button
        size={size}
        className={className}
        onClick={() =>
          blockedByCap ? setPaywallOpen(true) : setConfirmOpen(true)
        }
      >
        {blockedByCap && <Crown className="size-4" />}
        Rezerwuj
      </Button>

      {/* Buying is irreversible and creates a haulage job, so the numbers are
          restated in full before the user commits. */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zarezerwować tę partię?</DialogTitle>
            <DialogDescription>
              Partia zniknie z giełdy i trafi do rolnika do potwierdzenia.
              Sprzedaż dochodzi do skutku dopiero, gdy rolnik ją zaakceptuje.
              Zapłata idzie Waszym kanałem, poza platformą.
            </DialogDescription>
          </DialogHeader>

          <SummaryList
            items={[
              { label: "Zboże", value: grainLabel },
              { label: "Sprzedający", value: farmerName ?? "—" },
              { label: "Odbiór", value: location },
              { label: "Tonaż", value: tonnage },
              { label: "Cena za tonę", value: pricePerTonne },
              { label: "Wartość netto", value: totalNet, strong: true },
            ]}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Anuluj
              </Button>
            </DialogClose>
            <form action={submit} className="w-full sm:w-auto">
              <input type="hidden" name="offerId" value={offerId} />
              <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                {pending ? "Rezerwuję…" : `Rezerwuję za ${totalNet}`}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        remainingNet={remainingNet}
        attemptedNet={totalNet}
      />
    </>
  );
}
