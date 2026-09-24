export type Quote = {
  symbol: string;
  name: string;
  market: string;
  price: number;
  currency: string;
  unit: string;
  changePct: number;
};

/**
 * Mock market data. Replace with a real feed (MATIF / Euronext, CBOT) later —
 * the shape is what the ticker depends on, not the source.
 */
const BASE: Array<Omit<Quote, "price" | "changePct"> & { base: number }> = [
  { symbol: "BL2", name: "Pszenica MATIF", market: "Euronext", base: 214.5, currency: "EUR", unit: "t" },
  { symbol: "EMA", name: "Kukurydza MATIF", market: "Euronext", base: 197.25, currency: "EUR", unit: "t" },
  { symbol: "COM", name: "Rzepak MATIF", market: "Euronext", base: 482.75, currency: "EUR", unit: "t" },
  { symbol: "ZW", name: "Pszenica CBOT", market: "CBOT", base: 553.0, currency: "USD", unit: "bu" },
  { symbol: "ZC", name: "Kukurydza CBOT", market: "CBOT", base: 428.5, currency: "USD", unit: "bu" },
  { symbol: "PSZ-K", name: "Pszenica konsum. (kraj)", market: "Skup PL", base: 985, currency: "PLN", unit: "t" },
  { symbol: "RZE-K", name: "Rzepak (kraj)", market: "Skup PL", base: 2150, currency: "PLN", unit: "t" },
  { symbol: "ZYT-K", name: "Żyto (kraj)", market: "Skup PL", base: 762, currency: "PLN", unit: "t" },
];

/** Deterministic within a 60s bucket so a render is stable but refreshes move. */
function drift(seed: number, bucket: number) {
  const x = Math.sin(seed * 12.9898 + bucket * 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2; // -1..1
}

export function getMarketQuotes(): Quote[] {
  const bucket = Math.floor(Date.now() / 60_000);

  return BASE.map((quote, index) => {
    const changePct = Number((drift(index + 1, bucket) * 1.8).toFixed(2));
    const price = Number((quote.base * (1 + changePct / 100)).toFixed(2));
    return {
      symbol: quote.symbol,
      name: quote.name,
      market: quote.market,
      currency: quote.currency,
      unit: quote.unit,
      price,
      changePct,
    };
  });
}
