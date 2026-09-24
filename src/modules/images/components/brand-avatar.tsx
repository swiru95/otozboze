/** Initials from a display name, e.g. "Jan Kowalski" -> "JK". */
function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Falls back logoUrl -> Auth.js image -> initials. The identity provider owns
 * `image` and overwrites it on sign-in, so an in-app logo always wins.
 */
export function BrandAvatar({
  logoUrl,
  image,
  name,
  size = "md",
}: {
  logoUrl: string | null;
  image: string | null;
  name: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const src = logoUrl ?? image;
  const box =
    size === "lg" ? "size-14 text-lg" : size === "sm" ? "size-7 text-xs" : "size-10 text-sm";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- inline data URL.
      <img
        src={src}
        alt={name ? `Logo: ${name}` : "Logo konta"}
        className={`${box} shrink-0 rounded-lg object-cover ring-1 ring-foreground/10`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-secondary font-semibold text-secondary-foreground ring-1 ring-foreground/10`}
    >
      {initials(name)}
    </span>
  );
}
