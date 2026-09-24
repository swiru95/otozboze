/**
 * Mock price list. No payment provider is involved anywhere in this module —
 * every charge is a row written by the action layer.
 *
 * Amounts are strings so they go straight into `Decimal` columns without ever
 * becoming a JS number.
 */
export const PRICING = {
  /** One-off fee a farmer pays to pin an offer to the top of the board. */
  offerHighlightNet: "15.00",
  /** Flat pay-per-lead fee a carrier pays when claiming a job. */
  transportCommissionNet: "10.00",
  /** Buyer subscription, per month. */
  proMonthlyNet: "199.00",
  /**
   * A FREE buyer may purchase up to this much, net, per calendar month.
   * Beyond it the buy action refuses and the UI offers the upgrade.
   */
  freeBuyerMonthlyCapNet: "100000.00",
} as const;

/** How long a mock PRO period lasts. */
export const PRO_PERIOD_DAYS = 30;

export const TIER_LABELS = {
  FREE: "Plan darmowy",
  PRO: "Plan PRO",
} as const;

export const CHARGE_KIND_LABELS = {
  OFFER_HIGHLIGHT: "Wyróżnienie oferty",
  TRANSPORT_COMMISSION: "Prowizja od zlecenia",
  BUYER_SUBSCRIPTION: "Abonament PRO",
} as const;

/** First instant of the current calendar month — the cap resets here. */
export function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
