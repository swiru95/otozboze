"use client";

import { CheckCircle2, Paperclip, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentKind } from "@/generated/prisma/enums";
import {
  ACCEPTED_MIME_HINT,
  DOCUMENT_KIND_LABELS,
  formatBytes,
  MAX_DOCUMENT_BYTES,
} from "@/modules/documents/labels";

export type UploadedFileMeta = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
};

type Props = {
  /** Which document kinds this side may attach. */
  kinds: readonly DocumentKind[];
  onUploaded: (meta: UploadedFileMeta) => void;
  disabled?: boolean;
  /** Unique per instance, so two uploaders on one page keep separate labels. */
  idPrefix: string;
};

const UPLOAD_MS = 2000;
const TICK_MS = 80;

/**
 * MOCK UPLOAD. The file is never read and never leaves the browser — only its
 * name, type and size are passed up. The progress bar is a timer, sized to
 * feel like a real upload so the demo reads correctly.
 */
export function MockUploader({ kinds, onUploaded, disabled, idPrefix }: Props) {
  const [kind, setKind] = useState<DocumentKind>(kinds[0]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [lastFile, setLastFile] = useState<{ name: string; size: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only a cleanup: a pending timer must not fire after unmount.
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = (file: File) => {
    if (file.size === 0) {
      toast.error("Plik jest pusty");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error("Plik jest większy niż 10 MB");
      return;
    }

    const meta: UploadedFileMeta = {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      kind,
    };

    setLastFile({ name: file.name, size: file.size });
    setPhase("uploading");
    setProgress(0);

    let elapsed = 0;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      elapsed += TICK_MS;
      setProgress(Math.min(100, Math.round((elapsed / UPLOAD_MS) * 100)));

      if (elapsed >= UPLOAD_MS) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setPhase("done");
        onUploaded(meta);
      }
    }, TICK_MS);
  };

  const busy = disabled || phase === "uploading";
  const inputId = `${idPrefix}-file`;

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-kind`}>Rodzaj dokumentu</Label>
        <Select
          value={kind}
          onValueChange={(value) => setKind(value as DocumentKind)}
          disabled={busy}
        >
          <SelectTrigger id={`${idPrefix}-kind`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {kinds.map((value) => (
              <SelectItem key={value} value={value}>
                {DOCUMENT_KIND_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !busy) start(file);
        }}
        className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-input"
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) start(file);
            // Reset so picking the same file twice fires onChange again.
            event.target.value = "";
          }}
        />

        {phase === "uploading" ? (
          <div className="space-y-2 text-left">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Paperclip className="size-4 shrink-0" />
              <span className="truncate">{lastFile?.name}</span>
            </p>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground tabular-nums">
              Wysyłanie… {progress}%
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto size-6 text-muted-foreground" />
            <Button asChild variant="outline" size="sm" disabled={busy}>
              <label htmlFor={inputId} className="cursor-pointer">
                Wybierz plik
              </label>
            </Button>
            <p className="text-sm text-muted-foreground">
              albo przeciągnij tutaj. {ACCEPTED_MIME_HINT}.
            </p>
          </div>
        )}
      </div>

      {phase === "done" && lastFile && (
        <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="truncate font-medium">{lastFile.name}</span>
          <span className="ml-auto shrink-0 tabular-nums">
            {formatBytes(lastFile.size)}
          </span>
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Demo: plik nie jest wysyłany ani przechowywany. Zapisujemy tylko nazwę,
        typ i rozmiar.
      </p>
    </div>
  );
}
