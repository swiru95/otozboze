import type { ReactNode } from "react";

export type SummaryItem = {
  label: string;
  value: ReactNode;
  /** Emphasised row — use for the number the user is really agreeing to. */
  strong?: boolean;
};

/** Label/value pairs used to restate an action before it is committed. */
export function SummaryList({ items }: { items: SummaryItem[] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 px-3 py-2.5"
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd
            className={
              item.strong
                ? "text-right text-lg font-semibold tabular-nums"
                : "text-right font-medium tabular-nums"
            }
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
