import { prisma } from "@/lib/db/prisma";
import { reviewKey } from "@/modules/reviews/reviewable";

export type RatingSummary = { avg: number; count: number };
/** Plain record rather than a Map: this crosses into client components. */
export type RatingMap = Record<string, RatingSummary>;

/** Average rating per user, for reputation badges. */
export async function getRatingSummaries(
  userIds: string[],
): Promise<RatingMap> {
  if (userIds.length === 0) return {};

  const rows = await prisma.review.groupBy({
    by: ["subjectId"],
    where: { subjectId: { in: userIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [
      row.subjectId,
      { avg: row._avg.rating ?? 0, count: row._count._all },
    ]),
  );
}

/**
 * Reviews this user already wrote, keyed by transaction and counterparty, so
 * the UI can show the rating it left instead of the form.
 */
export async function getReviewsWrittenBy(authorId: string) {
  const rows = await prisma.review.findMany({
    where: { authorId },
    select: {
      rating: true,
      purchaseId: true,
      transportJobId: true,
      subjectId: true,
    },
  });

  const byPurchase = new Map<string, number>();
  const byJob = new Map<string, number>();

  for (const row of rows) {
    if (row.purchaseId) {
      byPurchase.set(reviewKey(row.purchaseId, row.subjectId), row.rating);
    }
    if (row.transportJobId) {
      byJob.set(reviewKey(row.transportJobId, row.subjectId), row.rating);
    }
  }

  return { byPurchase, byJob };
}

export async function listReviewsForUser(subjectId: string) {
  const rows = await prisma.review.findMany({
    where: { subjectId },
    select: {
      id: true,
      scope: true,
      rating: true,
      comment: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({ ...row, authorName: row.author.name }));
}

export async function listAllReviews() {
  const rows = await prisma.review.findMany({
    select: {
      id: true,
      scope: true,
      rating: true,
      comment: true,
      createdAt: true,
      author: { select: { name: true } },
      subject: { select: { name: true } },
      purchase: { select: { reference: true } },
      transportJob: { select: { reference: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
    authorName: row.author.name,
    subjectName: row.subject.name,
    transactionRef:
      row.purchase?.reference ?? row.transportJob?.reference ?? "—",
  }));
}
