import { Wheat } from "lucide-react";

/**
 * Marketplace thumbnail. Offers without a photo get a tinted wheat mark
 * rather than an empty box, so every row keeps the same rhythm.
 */
export function OfferThumbnail({
  src,
  alt,
  size = "md",
}: {
  src: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "size-24" : size === "sm" ? "size-12" : "size-16";

  if (!src) {
    return (
      <div
        role="img"
        aria-label={`${alt} — brak zdjęcia`}
        className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-accent/20 ring-1 ring-foreground/10`}
      >
        <Wheat className="size-1/2 text-accent-foreground/60" />
      </div>
    );
  }

  return (
    // Inline data URL: next/image cannot optimise it and there is no remote
    // host to configure, so a plain img is correct here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`${box} shrink-0 rounded-lg object-cover ring-1 ring-foreground/10`}
    />
  );
}
