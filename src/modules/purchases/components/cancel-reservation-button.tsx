"use client";

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
import { cancelReservation } from "@/modules/purchases/actions/cancel-reservation";

type Props = {
  purchaseId: string;
  grainLabel: string;
  tonnage: string;
  totalNet: string;
  reference: string;
  farmerName: string | null;
  className?: string;
};

/**
 * Lets a buyer walk away from a reservation the farmer has not answered.
 * Only rendered while the purchase is still PENDING — once it is confirmed,
 * both sides are committed and this is no longer a one-sided decision.
 */
export function CancelReservationButton({
  purchaseId,
  grainLabel,
  tonnage,
  totalNet,
  reference,
  farmerName,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await cancelReservation(null, formData);
      if (result.ok) {
        toast.success("Rezerwacja wycofana. Partia wróciła na giełdę.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        Wycofaj rezerwację
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wycofać rezerwację?</DialogTitle>
          <DialogDescription>
            Partia wróci na giełdę i kupi ją kto inny. Nic Cię to nie kosztuje,
            bo rolnik jeszcze nie potwierdził sprzedaży.
          </DialogDescription>
        </DialogHeader>

        <SummaryList
          items={[
            { label: "Zboże", value: grainLabel },
            { label: "Sprzedający", value: farmerName ?? "—" },
            { label: "Numer", value: reference },
            { label: "Tonaż", value: tonnage },
            { label: "Wartość netto", value: totalNet, strong: true },
          ]}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Zostaw rezerwację
            </Button>
          </DialogClose>
          <form action={submit} className="w-full sm:w-auto">
            <input type="hidden" name="purchaseId" value={purchaseId} />
            <Button
              type="submit"
              variant="destructive"
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? "Wycofuję…" : "Tak, wycofaj"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
