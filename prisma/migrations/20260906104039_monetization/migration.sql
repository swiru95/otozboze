-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "ChargeKind" AS ENUM ('OFFER_HIGHLIGHT', 'TRANSPORT_COMMISSION', 'BUYER_SUBSCRIPTION');

-- AlterTable
ALTER TABLE "GrainOffer" ADD COLUMN     "highlightFeeNet" DECIMAL(10,2),
ADD COLUMN     "highlightedAt" TIMESTAMP(3),
ADD COLUMN     "isHighlighted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TransportJob" ADD COLUMN     "commissionFeeNet" DECIMAL(10,2),
ADD COLUMN     "commissionFeePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commissionPaidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscribedAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "subscriptionUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformCharge" (
    "id" TEXT NOT NULL,
    "kind" "ChargeKind" NOT NULL,
    "userId" TEXT NOT NULL,
    "amountNet" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "offerId" TEXT,
    "transportJobId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformCharge_userId_createdAt_idx" ON "PlatformCharge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformCharge_kind_createdAt_idx" ON "PlatformCharge"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "GrainOffer_status_isHighlighted_createdAt_idx" ON "GrainOffer"("status", "isHighlighted", "createdAt");

-- AddForeignKey
ALTER TABLE "PlatformCharge" ADD CONSTRAINT "PlatformCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCharge" ADD CONSTRAINT "PlatformCharge_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "GrainOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCharge" ADD CONSTRAINT "PlatformCharge_transportJobId_fkey" FOREIGN KEY ("transportJobId") REFERENCES "TransportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
