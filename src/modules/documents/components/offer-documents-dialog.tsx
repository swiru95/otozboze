"use client";

import { BadgeCheck, FlaskConical } from "lucide-react";
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
import { DocumentList } from "@/modules/documents/components/document-list";
import type { DocumentVm } from "@/modules/documents/view";

/**
 * Green marker on the buyer board. It reads the attachments, so it cannot
 * claim a certificate the offer does not carry.
 */
export function ComplianceBadge({
  hasCertificate,
}: {
  hasCertificate: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
      {hasCertificate ? (
        <>
          <BadgeCheck className="size-3.5" />
          Z certyfikatem
        </>
      ) : (
        <>
          <FlaskConical className="size-3.5" />
          Wyniki badań
        </>
      )}
    </span>
  );
}

export function OfferDocumentsDialog({
  grainLabel,
  reference,
  docs,
  className,
}: {
  grainLabel: string;
  reference: string;
  docs: DocumentVm[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        Zobacz dokumenty ({docs.length})
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dokumenty partii</DialogTitle>
          <DialogDescription>
            {grainLabel} · {reference}. Dokumenty wgrał sprzedający. Platforma
            ich nie weryfikuje, dopóki nie widnieje znacznik „zweryfikowany”.
          </DialogDescription>
        </DialogHeader>

        <DocumentList docs={docs} />

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
