"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SummaryList } from "@/components/layout/summary-list";
import { formatPln } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRICING } from "@/modules/billing/pricing";
import { claimJob } from "@/modules/transport/actions/accept-job";

type Props = {
  jobId: string;
  route: string;
  grainLabel: string;
  tonnage: string;
  distance: string;
  ratePerTonne: string;
  totalNet: string;
  /** Job value minus the platform commission, formatted on the server. */
  netAfterFee: string;
  className?: string;
  size?: "sm" | "default";
};

export function AcceptJobButton({
  jobId,
  route,
  grainLabel,
  tonnage,
  distance,
  ratePerTonne,
  totalNet,
  netAfterFee,
  className,
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await claimJob(null, formData);
      if (result.ok) {
        toast.success("Zgłoszenie wysłane. Czekasz na akceptację kupującego.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} className={className}>
          Zgłoś się
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zgłosić się po ten kurs?</DialogTitle>
          <DialogDescription>
            Kurs zostanie zarezerwowany dla Ciebie i zniknie z giełdy, ale
            jedzie dopiero po akceptacji kupującego. Prowizję{" "}
            {formatPln(PRICING.transportCommissionNet)} netto pobieramy dopiero
            wtedy — za zgłoszenie nie płacisz.
          </DialogDescription>
        </DialogHeader>

        <SummaryList
          items={[
            { label: "Trasa", value: route },
            { label: "Dystans", value: distance },
            { label: "Ładunek", value: grainLabel },
            { label: "Tonaż", value: tonnage },
            { label: "Stawka za tonę", value: ratePerTonne },
            { label: "Zarobek brutto z kursu", value: totalNet },
            {
              label: "Prowizja po akceptacji",
              value: `- ${formatPln(PRICING.transportCommissionNet)}`,
            },
            { label: "Zostaje dla Ciebie", value: netAfterFee, strong: true },
          ]}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Anuluj
            </Button>
          </DialogClose>
          <form action={submit} className="w-full sm:w-auto">
            <input type="hidden" name="jobId" value={jobId} />
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Zgłaszam…" : "Zgłoś się po ten kurs"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
