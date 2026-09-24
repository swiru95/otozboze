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
import { withdrawOffer } from "@/modules/offers/actions/withdraw-offer";

type Props = {
  offerId: string;
  grainLabel: string;
  tonnage: string;
  totalNet: string;
  reference: string;
  className?: string;
};

/** Takes a listing off the board. Only rendered for offers still on sale. */
export function WithdrawButton({
  offerId,
  grainLabel,
  tonnage,
  totalNet,
  reference,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await withdrawOffer(null, formData);
      if (result.ok) {
        toast.success("Oferta wycofana z giełdy");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="destructive"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        Wycofaj
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wycofać ofertę z giełdy?</DialogTitle>
          <DialogDescription>
            Oferta zniknie z giełdy i nikt jej już nie kupi. Opłata za
            wyróżnienie nie jest zwracana. Żeby wrócić na giełdę, wystaw partię
            jeszcze raz.
          </DialogDescription>
        </DialogHeader>

        <SummaryList
          items={[
            { label: "Zboże", value: grainLabel },
            { label: "Numer", value: reference },
            { label: "Tonaż", value: tonnage },
            { label: "Wartość netto", value: totalNet, strong: true },
          ]}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Zostaw na giełdzie
            </Button>
          </DialogClose>
          <form action={submit} className="w-full sm:w-auto">
            <input type="hidden" name="offerId" value={offerId} />
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
