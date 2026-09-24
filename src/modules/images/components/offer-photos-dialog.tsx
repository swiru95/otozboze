"use client";

import { useState } from "react";

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

/**
 * Full-size view of a lot's pictures. Only opened from the farmer's own list,
 * which is short — the public board deliberately carries thumbnails only.
 */
export function OfferPhotosDialog({
  photos,
  grainLabel,
  reference,
  className,
}: {
  photos: string[];
  grainLabel: string;
  reference: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (photos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        Zdjęcia ({photos.length})
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Zdjęcia partii</DialogTitle>
          <DialogDescription>
            {grainLabel} · {reference}. Pierwsze zdjęcie widzą kupujący na
            giełdzie.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {photos.map((url, index) => (
            <li key={url.slice(-32) + index}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${grainLabel}, zdjęcie ${index + 1} z ${photos.length}`}
                loading="lazy"
                className="aspect-4/3 w-full rounded-lg object-cover ring-1 ring-foreground/10"
              />
            </li>
          ))}
        </ul>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
              Zamknij
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
