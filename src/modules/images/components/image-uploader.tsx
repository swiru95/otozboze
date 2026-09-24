"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ACCEPTED_IMAGE_HINT,
  ACCEPTED_IMAGE_TYPES,
  IMAGE_BUDGET,
} from "@/modules/images/constants";
import { processImage, type ProcessedImage } from "@/modules/images/downscale";

type Props = {
  /** Unique per instance so several uploaders can share a page. */
  idPrefix: string;
  onUploaded: (image: ProcessedImage) => void;
  budget?: { maxEdge: number; maxBytes: number };
  disabled?: boolean;
  hint?: string;
  /** Square zone for a logo, wide zone for photo sets. */
  variant?: "wide" | "tile";
};

const SIMULATED_MS = 1400;
const TICK_MS = 70;
/** Anything larger than this is a camera original we refuse before decoding. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * MOCK UPLOAD. The picture is decoded, downscaled and re-encoded in the
 * browser; nothing is sent anywhere by this component. The progress bar is a
 * timer so the demo reads like a real upload.
 */
export function ImageUploader({
  idPrefix,
  onUploaded,
  budget = IMAGE_BUDGET.photo,
  disabled,
  hint,
  variant = "wide",
}: Props) {
  const [phase, setPhase] = useState<"idle" | "working" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const finisher = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup only: a pending timer must not fire after unmount.
  useEffect(() => () => {
    if (ticker.current) clearInterval(ticker.current);
    if (finisher.current) clearTimeout(finisher.current);
  }, []);

  const stopTicker = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };

  const start = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("To nie jest plik graficzny");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("Zdjęcie jest większe niż 20 MB");
      return;
    }

    setPhase("working");
    setProgress(0);

    let elapsed = 0;
    stopTicker();
    ticker.current = setInterval(() => {
      elapsed += TICK_MS;
      setProgress(Math.min(99, Math.round((elapsed / SIMULATED_MS) * 100)));
    }, TICK_MS);

    const started = Date.now();

    try {
      const image = await processImage(file, budget);
      const remaining = Math.max(0, SIMULATED_MS - (Date.now() - started));

      finisher.current = setTimeout(() => {
        stopTicker();
        setProgress(100);
        setPreview(image.thumbnailUrl);
        setPhase("done");
        onUploaded(image);
      }, remaining);
    } catch {
      stopTicker();
      setPhase("idle");
      toast.error("Nie udało się przetworzyć zdjęcia");
    }
  };

  const busy = disabled || phase === "working";
  const inputId = `${idPrefix}-image`;

  return (
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
        if (file && !busy) void start(file);
      }}
      className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-input"
      } ${variant === "tile" ? "min-h-40" : ""}`}
    >
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void start(file);
          // Reset so picking the same file twice fires onChange again.
          event.target.value = "";
        }}
      />

      {phase === "working" ? (
        <div className="space-y-2">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground tabular-nums">
            Przetwarzanie zdjęcia… {progress}%
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {phase === "done" && preview ? (
            // Inline data URL, so next/image has nothing to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Ostatnio dodane zdjęcie"
              className="mx-auto size-16 rounded-lg object-cover ring-1 ring-foreground/10"
            />
          ) : (
            <ImagePlus className="mx-auto size-6 text-muted-foreground" />
          )}

          <Button asChild variant="outline" size="sm" disabled={busy}>
            <label htmlFor={inputId} className="cursor-pointer">
              {phase === "done" ? "Dodaj kolejne" : "Wybierz zdjęcie"}
            </label>
          </Button>

          <p className="text-sm text-muted-foreground">
            {hint ?? `albo przeciągnij tutaj. ${ACCEPTED_IMAGE_HINT}.`}
          </p>
        </div>
      )}
    </div>
  );
}
