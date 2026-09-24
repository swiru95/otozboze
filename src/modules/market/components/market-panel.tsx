import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMarketQuotes } from "@/modules/market/queries/quotes";

export function MarketPanel() {
  const quotes = getMarketQuotes();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notowania</CardTitle>
        <CardDescription>Dane poglądowe (mock)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {quotes.map((quote) => {
          const up = quote.changePct >= 0;
          return (
            <div
              key={quote.symbol}
              className="flex items-center justify-between border-b py-1.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{quote.name}</p>
                <p className="text-xs uppercase text-muted-foreground">
                  {quote.market}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {quote.price.toLocaleString("pl-PL", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {quote.currency}/{quote.unit}
                  </span>
                </p>
                <p
                  className={`text-xs tabular-nums ${
                    up
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {up ? "▲" : "▼"} {Math.abs(quote.changePct).toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
