import { prisma } from "@/lib/db/prisma";
import {
  isJobReviewable,
  isPurchaseReviewable,
} from "@/modules/reviews/reviewable";

/**
 * The rule that makes reviews trustworthy: you may only review someone you
 * actually transacted with, on the record of that transaction.
 *
 * Resolved server-side from the transaction itself — never from anything the
 * client sends beyond the transaction id.
 */
export type Counterparties = {
  /** Who is allowed to write a review on this transaction. */
  authors: string[];
  /** For a given author, the one counterparty they may review. */
  subjectFor: (authorId: string) => string[];
};

/** TRADE: the two sides of a purchase — buyer and the offer's farmer. */
export async function tradeCounterparties(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    select: {
      status: true,
      buyerId: true,
      offer: { select: { farmerId: true } },
    },
  });

  if (!purchase) throw new Error("Transakcja nie istnieje");
  // A deal that fell apart is worth reviewing; one that never happened is not.
  if (!isPurchaseReviewable(purchase.status)) {
    throw new Error("Rezerwacja bez potwierdzenia nie podlega ocenie");
  }

  const buyerId = purchase.buyerId;
  const farmerId = purchase.offer.farmerId;

  return {
    authors: [buyerId, farmerId],
    subjectFor: (authorId: string) =>
      authorId === buyerId ? [farmerId] : authorId === farmerId ? [buyerId] : [],
  } satisfies Counterparties;
}

/**
 * TRANSPORT: every review has the carrier on one side. The carrier may rate
 * the buyer who commissioned the delivery and the farmer who loaded it, and
 * both of them may rate the carrier.
 */
export async function transportCounterparties(transportJobId: string) {
  const job = await prisma.transportJob.findUnique({
    where: { id: transportJobId },
    select: {
      status: true,
      carrierId: true,
      purchase: {
        select: { buyerId: true, offer: { select: { farmerId: true } } },
      },
    },
  });

  if (!job) throw new Error("Zlecenie nie istnieje");
  if (!job.carrierId || !isJobReviewable(job.status, job.carrierId)) {
    throw new Error(
      "Kurs nie doszedł do skutku — zgłoszenie przewoźnika nie podlega ocenie",
    );
  }

  const carrierId = job.carrierId;
  const buyerId = job.purchase.buyerId;
  const farmerId = job.purchase.offer.farmerId;

  return {
    authors: [carrierId, buyerId, farmerId],
    subjectFor: (authorId: string) => {
      if (authorId === carrierId) {
        // Carrier rates the other parties, never themselves.
        return [buyerId, farmerId].filter((id) => id !== carrierId);
      }
      if (authorId === buyerId || authorId === farmerId) return [carrierId];
      return [];
    },
  } satisfies Counterparties;
}

/**
 * Throws unless `authorId` was a party to the transaction and `subjectId` is a
 * valid counterparty within it.
 */
export async function assertCanReview(args: {
  scope: "TRADE" | "TRANSPORT";
  purchaseId?: string;
  transportJobId?: string;
  authorId: string;
  subjectId: string;
}) {
  const parties =
    args.scope === "TRADE"
      ? await tradeCounterparties(args.purchaseId!)
      : await transportCounterparties(args.transportJobId!);

  if (!parties.authors.includes(args.authorId)) {
    throw new Error("Nie brałeś udziału w tej transakcji");
  }

  if (args.authorId === args.subjectId) {
    throw new Error("Nie można oceniać samego siebie");
  }

  if (!parties.subjectFor(args.authorId).includes(args.subjectId)) {
    throw new Error("Ta osoba nie jest Twoim kontrahentem w tej transakcji");
  }
}
