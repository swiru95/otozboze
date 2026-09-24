import { Star } from "lucide-react";

export function RatingBadge({
  avg,
  count,
}: {
  avg: number | undefined;
  count: number | undefined;
}) {
  if (!count) {
    return <span className="text-sm text-muted-foreground">brak ocen</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-sm"
      title={`Średnia z ${count} ocen`}
    >
      <Star className="size-3.5 fill-accent text-accent" />
      <span className="font-semibold tabular-nums">{avg?.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}
