-- CreateEnum
CREATE TYPE "ReviewScope" AS ENUM ('TRADE', 'TRANSPORT');

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "scope" "ReviewScope" NOT NULL,
    "purchaseId" TEXT,
    "transportJobId" TEXT,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_subjectId_idx" ON "Review"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_purchaseId_authorId_subjectId_key" ON "Review"("purchaseId", "authorId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_transportJobId_authorId_subjectId_key" ON "Review"("transportJobId", "authorId", "subjectId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_transportJobId_fkey" FOREIGN KEY ("transportJobId") REFERENCES "TransportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A review must be anchored to EXACTLY ONE transaction, matching its scope.
ALTER TABLE "Review" ADD CONSTRAINT "Review_scope_anchor_check" CHECK (
  (scope = 'TRADE'     AND "purchaseId" IS NOT NULL AND "transportJobId" IS NULL)
  OR
  (scope = 'TRANSPORT' AND "transportJobId" IS NOT NULL AND "purchaseId" IS NULL)
);

-- Nobody reviews themselves.
ALTER TABLE "Review" ADD CONSTRAINT "Review_no_self_review_check"
  CHECK ("authorId" <> "subjectId");

-- Ratings are 1..5.
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range_check"
  CHECK (rating BETWEEN 1 AND 5);
