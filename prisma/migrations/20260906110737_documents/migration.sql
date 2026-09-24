/*
  Warnings:

  - You are about to drop the column `labReportUrl` on the `GrainQuality` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('LAB_RESULT', 'ISCC_CERTIFICATE', 'GMP_PLUS', 'EUDR_STATEMENT', 'QUALITY_CERTIFICATE', 'TRANSPORT_LICENCE', 'CARRIER_INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('OFFER', 'CARRIER');

-- AlterTable
ALTER TABLE "GrainQuality" DROP COLUMN "labReportUrl";

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "scope" "DocumentScope" NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "offerId" TEXT,
    "carrierId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_offerId_idx" ON "Document"("offerId");

-- CreateIndex
CREATE INDEX "Document_carrierId_kind_idx" ON "Document"("carrierId", "kind");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "GrainOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A document must hang off EXACTLY ONE owner, matching its scope.
ALTER TABLE "Document" ADD CONSTRAINT "Document_scope_owner_check" CHECK (
  (scope = 'OFFER'   AND "offerId" IS NOT NULL AND "carrierId" IS NULL)
  OR
  (scope = 'CARRIER' AND "carrierId" IS NOT NULL AND "offerId" IS NULL)
);

-- A zero-byte upload is a failed upload.
ALTER TABLE "Document" ADD CONSTRAINT "Document_size_check"
  CHECK ("sizeBytes" > 0);
