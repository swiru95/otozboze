/**
 * How long each side has to deliver on what was agreed, counted from the
 * farmer's confirmation.
 */
export const FULFILMENT_DAYS = 30;

/**
 * How long a reservation may sit waiting for the farmer's answer. Past this
 * the offer goes back on the board: `Purchase.offerId` is unique, so a
 * reservation nobody answers would otherwise block the lot for good.
 */
export const RESERVATION_HOURS = 72;

/**
 * Freight pricing. Strings, so they reach `Decimal` columns without ever
 * being a JS number.
 */
export const FREIGHT = {
  /** Per tonne, per kilometre — the distance-dependent part of the rate. */
  ratePerTonneKm: "0.28",
  /** Floor for a short hop, where loading dominates the cost of driving. */
  minRatePerTonne: "25.00",
  /** Used when either end of the route has no coordinates to measure from. */
  fallbackRatePerTonne: "45.00",
} as const;

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Days left until `deadline`, negative once it has passed. */
export function daysUntil(deadline: Date, now = new Date()) {
  return Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3_600_000);
}

/** The moment a reservation created now stops being valid. */
export function reservationDeadline(createdAt: Date) {
  return addHours(createdAt, RESERVATION_HOURS);
}
