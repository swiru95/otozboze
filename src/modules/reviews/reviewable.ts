import type {
  PurchaseStatus,
  TransportJobStatus,
} from "@/generated/prisma/enums";

/**
 * A deal may be reviewed once it took effect, or once it fell apart after
 * taking effect. Something that never happened is not reviewable: a
 * reservation nobody confirmed says nothing about either party.
 *
 * Pure predicates, so the server action and the UI apply the same rule and
 * cannot drift apart.
 */
export function isPurchaseReviewable(status: PurchaseStatus) {
  return status !== "PENDING";
}

export function isJobReviewable(
  status: TransportJobStatus,
  carrierId: string | null,
) {
  if (!carrierId) return false;
  // ASSIGNED means the carrier applied and nobody accepted them yet.
  return status !== "AVAILABLE" && status !== "ASSIGNED";
}

export const PURCHASE_NOT_REVIEWABLE_REASON =
  "Ocena po potwierdzeniu sprzedaży";
export const JOB_NOT_REVIEWABLE_REASON = "Ocena po akceptacji przewoźnika";

/**
 * Key for the "already reviewed" lookups: one transaction, one counterparty.
 *
 * The transaction id alone is not enough. A haulage job has two reviewable
 * counterparties for the carrier — the buyer who commissioned it and the
 * farmer who loaded it — and the unique indexes allow one review for each.
 * Keying on the job alone hid the second form as soon as the first was sent.
 *
 * Lives here rather than next to the query because client components read it,
 * and the query module pulls in Prisma.
 */
export function reviewKey(transactionId: string, subjectId: string) {
  return `${transactionId}:${subjectId}`;
}
