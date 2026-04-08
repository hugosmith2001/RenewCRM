-- Phase 2 + 4: Customers, contacts, insured objects

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PRIVATE', 'COMPANY');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT');

-- CreateEnum
CREATE TYPE "InsuredObjectType" AS ENUM ('PROPERTY', 'VEHICLE', 'PERSON', 'BUSINESS', 'EQUIPMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'PRIVATE',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "restrictedAt" TIMESTAMP(3),
    "restrictedByUserId" TEXT,
    "restrictionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "restrictedAt" TIMESTAMP(3),
    "restrictedByUserId" TEXT,
    "restrictionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuredObject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "InsuredObjectType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuredObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_status_idx" ON "Customer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Customer_tenantId_name_idx" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Customer_tenantId_deletedAt_idx" ON "Customer"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Customer_tenantId_legalHold_idx" ON "Customer"("tenantId", "legalHold");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_idx" ON "CustomerContact"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE INDEX "InsuredObject_tenantId_idx" ON "InsuredObject"("tenantId");

-- CreateIndex
CREATE INDEX "InsuredObject_customerId_idx" ON "InsuredObject"("customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuredObject" ADD CONSTRAINT "InsuredObject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuredObject" ADD CONSTRAINT "InsuredObject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

