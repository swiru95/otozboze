"use client";

import { BadgeCheck, CheckCircle2, Eye, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DocumentVm } from "@/modules/documents/view";

type Props = {
  docs: DocumentVm[];
  /** Omitted on read-only views such as the buyer's certificate dialog. */
  onDelete?: (id: string) => void;
  pendingId?: string | null;
};

/** Nothing is stored, so "preview" says so instead of opening a dead link. */
function previewNotice() {
  toast.info("Demo: podgląd pliku nie jest dostępny — plik nie jest przechowywany.");
}

export function DocumentList({ docs, onDelete, pendingId }: Props) {
  if (docs.length === 0) return null;

  return (
    <ul className="grid gap-2">
      {docs.map((doc) => (
        <li
          key={doc.id}
          className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
            doc.isExpired ? "opacity-60" : ""
          }`}
        >
          <FileText className="size-5 shrink-0 text-muted-foreground" />

          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {doc.kindLabel}
              {doc.isVerified && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                  <BadgeCheck className="size-4" />
                  zweryfikowany
                </span>
              )}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {doc.fileName} · {doc.sizeLabel}
              {doc.issuer ? ` · ${doc.issuer}` : ""}
            </p>
            {doc.validUntilLabel && (
              <p
                className={`text-sm ${
                  doc.isExpired ? "font-medium text-destructive" : "text-muted-foreground"
                }`}
              >
                {doc.isExpired
                  ? `Wygasł ${doc.validUntilLabel}`
                  : `Ważny do ${doc.validUntilLabel}`}
              </p>
            )}
          </div>

          {!doc.isExpired && !doc.validUntilLabel && (
            <CheckCircle2 className="size-4 shrink-0 text-success" />
          )}

          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" onClick={previewNotice}>
              <Eye className="size-4" />
              Podgląd
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Usuń ${doc.fileName}`}
                disabled={pendingId === doc.id}
                onClick={() => onDelete(doc.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
