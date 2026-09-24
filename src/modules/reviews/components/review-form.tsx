"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/modules/reviews/actions/submit-review";

type Props = {
  scope: "TRADE" | "TRANSPORT";
  purchaseId?: string;
  transportJobId?: string;
  subjectId: string;
  subjectName: string | null;
  /** Rating already given by the current user, if any. */
  existingRating?: number;
};

const RATING_WORDS = ["", "Źle", "Słabo", "W porządku", "Dobrze", "Wzorowo"];

function StaticStars({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Ocena ${value} z 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= value
              ? "size-4 fill-accent text-accent"
              : "size-4 text-muted-foreground/30"
          }
        />
      ))}
    </span>
  );
}

export function ReviewForm({
  scope,
  purchaseId,
  transportJobId,
  subjectId,
  subjectName,
  existingRating,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await submitReview(null, formData);
      if (result.ok) {
        toast.success("Dziękujemy za opinię");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });

  if (existingRating) return <StaticStars value={existingRating} />;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Oceń
        </Button>
      </DialogTrigger>
      {/* A dialog rather than an inline form: the old version expanded inside a
          table cell, which pushed the row apart and gave a 12px textarea. */}
      <DialogContent className="sm:max-w-md">
        <form action={submit}>
          <input type="hidden" name="scope" value={scope} />
          {purchaseId && (
            <input type="hidden" name="purchaseId" value={purchaseId} />
          )}
          {transportJobId && (
            <input type="hidden" name="transportJobId" value={transportJobId} />
          )}
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="rating" value={rating} />

          <DialogHeader>
            <DialogTitle>Oceń: {subjectName ?? "kontrahenta"}</DialogTitle>
            <DialogDescription>
              Ocena jest widoczna przy tym koncie na giełdzie.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} z 5`}
                  aria-pressed={value === rating}
                  onClick={() => setRating(value)}
                  className="rounded-md p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={
                      value <= rating
                        ? "size-9 fill-accent text-accent"
                        : "size-9 text-muted-foreground/30"
                    }
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium">{RATING_WORDS[rating]}</p>
          </div>

          <Textarea
            name="comment"
            rows={3}
            placeholder="Komentarz (opcjonalnie) — np. terminowość, jakość towaru"
          />

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Anuluj
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Wysyłam…" : "Wyślij ocenę"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
