"use client";

import { Check, Crown } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

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
import { formatPln } from "@/lib/format";
import { upgradeToPro } from "@/modules/billing/actions/upgrade-to-pro";
import { PRICING } from "@/modules/billing/pricing";

const PRO_BENEFITS = [
  "Bez miesięcznego limitu zakupów",
  "Automatyczne zlecenia transportu po każdym zakupie",
  "Pierwszeństwo w kontakcie ze sprzedającymi",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Formatted allowance left this month, for the explanation. */
  remainingNet: string;
  /** Formatted value of the purchase that hit the ceiling, if any. */
  attemptedNet?: string;
};

/**
 * Shown when a FREE buyer's purchase would exceed the monthly allowance. The
 * real ceiling is enforced in the buy action; this dialog only explains it
 * and offers the (mock) upgrade.
 */
export function PaywallDialog({
  open,
  onOpenChange,
  remainingNet,
  attemptedNet,
}: Props) {
  const [pending, startTransition] = useTransition();

  const upgrade = () =>
    startTransition(async () => {
      const result = await upgradeToPro();
      if (result.ok) {
        toast.success("Plan PRO aktywny — limit zdjęty");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="size-5 text-accent" />
            Przekroczony limit planu darmowego
          </DialogTitle>
          <DialogDescription>
            {attemptedNet
              ? `Ten zakup opiewa na ${attemptedNet}, a w tym miesiącu zostało Ci ${remainingNet}.`
              : `W tym miesiącu zostało Ci ${remainingNet} limitu.`}{" "}
            Plan PRO znosi limit całkowicie.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border p-4">
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatPln(PRICING.proMonthlyNet)}
            </span>
            <span className="text-sm text-muted-foreground">
              netto / miesiąc
            </span>
          </p>
          <ul className="mt-3 space-y-2">
            {PRO_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Demo: płatność nie jest realizowana, plan włącza się od razu.
        </p>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Może później
            </Button>
          </DialogClose>
          <Button onClick={upgrade} disabled={pending} className="w-full sm:w-auto">
            {pending ? "Aktywuję…" : "Symuluj przejście na PRO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
