import { getMarketQuotes } from "@/modules/market/queries/quotes";

function QuoteItem({
  quote,
}: {
  quote: ReturnType<typeof getMarketQuotes>[number];
}) {
  const up = quote.changePct >= 0;

  return (
    <div className="flex shrink-0 items-baseline gap-2 px-5">
      <span className="text-sm font-medium text-muted-foreground">
        {quote.name}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {quote.price.toLocaleString("pl-PL", { minimumFractionDigits: 2 })}
      </span>
      <span className="text-xs uppercase text-muted-foreground">
        {quote.currency}/{quote.unit}
      </span>
      <span
        className={`text-sm font-medium tabular-nums ${
          up
            ? "text-success"
            : "text-destructive"
        }`}
      >
        {up ? "▲" : "▼"} {Math.abs(quote.changePct).toFixed(2)}%
      </span>
    </div>
  );
}

/**
 * Scrolling market quotes. The list is rendered twice so the CSS animation can
 * loop seamlessly; `aria-hidden` keeps the duplicate out of the a11y tree.
 */
export function MarketTicker() {
  const quotes = getMarketQuotes();

  return (
    <section
      aria-label="Notowania rynkowe"
      className="relative overflow-hidden border-y bg-muted/30 py-2"
    >
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused]">
        <div className="flex">
          {quotes.map((quote) => (
            <QuoteItem key={quote.symbol} quote={quote} />
          ))}
        </div>
        <div className="flex" aria-hidden="true">
          {quotes.map((quote) => (
            <QuoteItem key={`dup-${quote.symbol}`} quote={quote} />
          ))}
        </div>
      </div>
    </section>
  );
}
