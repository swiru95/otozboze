-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'BUYER', 'TRANSPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "GrainType" AS ENUM ('WHEAT_CONSUMPTION', 'WHEAT_FEED', 'RYE', 'BARLEY_MALTING', 'BARLEY_FEED', 'OATS', 'TRITICALE', 'MAIZE', 'RAPESEED', 'SOYBEAN', 'SUNFLOWER', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_TRANSPORT', 'DELIVERED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransportJobStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TIPPER', 'WALKING_FLOOR', 'SILO_TANKER', 'CONTAINER', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('FARM', 'WAREHOUSE', 'ELEVATOR', 'PORT', 'MILL', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "roles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[],
    "activeRole" "UserRole",
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nip" TEXT,
    "regon" TEXT,
    "krs" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "kind" "LocationKind" NOT NULL DEFAULT 'FARM',
    "label" TEXT,
    "street" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "voivodeship" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'PL',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrainOffer" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "grainType" "GrainType" NOT NULL,
    "harvestYear" INTEGER NOT NULL,
    "tonnage" DECIMAL(10,2) NOT NULL,
    "pricePerTonne" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "description" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableUntil" TIMESTAMP(3),
    "farmerId" TEXT NOT NULL,
    "pickupLocationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrainOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrainQuality" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "moisture" DECIMAL(5,2),
    "protein" DECIMAL(5,2),
    "gluten" DECIMAL(5,2),
    "fallingNumber" INTEGER,
    "testWeight" DECIMAL(5,2),
    "impurities" DECIMAL(5,2),
    "damagedGrains" DECIMAL(5,2),
    "sproutedGrains" DECIMAL(5,2),
    "isCertified" BOOLEAN NOT NULL DEFAULT false,
    "labReportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrainQuality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "tonnage" DECIMAL(10,2) NOT NULL,
    "pricePerTonne" DECIMAL(10,2) NOT NULL,
    "totalNet" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "deliveryLocationId" TEXT NOT NULL,
    "expectedDeliveryAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportJob" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "status" "TransportJobStatus" NOT NULL DEFAULT 'AVAILABLE',
    "carrierId" TEXT,
    "pickupLocationId" TEXT NOT NULL,
    "deliveryLocationId" TEXT NOT NULL,
    "tonnage" DECIMAL(10,2) NOT NULL,
    "distanceKm" INTEGER,
    "ratePerTonne" DECIMAL(10,2),
    "totalNet" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "vehicleType" "VehicleType",
    "vehiclePlate" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "pickupFrom" TIMESTAMP(3),
    "pickupTo" TIMESTAMP(3),
    "deliverBy" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roles_idx" ON "User" USING GIN ("roles");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Company_nip_key" ON "Company"("nip");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Location_postalCode_idx" ON "Location"("postalCode");

-- CreateIndex
CREATE INDEX "Location_voivodeship_idx" ON "Location"("voivodeship");

-- CreateIndex
CREATE INDEX "Location_companyId_idx" ON "Location"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "GrainOffer_reference_key" ON "GrainOffer"("reference");

-- CreateIndex
CREATE INDEX "GrainOffer_status_grainType_idx" ON "GrainOffer"("status", "grainType");

-- CreateIndex
CREATE INDEX "GrainOffer_farmerId_idx" ON "GrainOffer"("farmerId");

-- CreateIndex
CREATE INDEX "GrainOffer_createdAt_idx" ON "GrainOffer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrainQuality_offerId_key" ON "GrainQuality"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_reference_key" ON "Purchase"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_offerId_key" ON "Purchase"("offerId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_buyerId_idx" ON "Purchase"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportJob_reference_key" ON "TransportJob"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "TransportJob_purchaseId_key" ON "TransportJob"("purchaseId");

-- CreateIndex
CREATE INDEX "TransportJob_status_createdAt_idx" ON "TransportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TransportJob_carrierId_idx" ON "TransportJob"("carrierId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrainOffer" ADD CONSTRAINT "GrainOffer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrainOffer" ADD CONSTRAINT "GrainOffer_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrainQuality" ADD CONSTRAINT "GrainQuality_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "GrainOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "GrainOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportJob" ADD CONSTRAINT "TransportJob_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportJob" ADD CONSTRAINT "TransportJob_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportJob" ADD CONSTRAINT "TransportJob_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportJob" ADD CONSTRAINT "TransportJob_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
