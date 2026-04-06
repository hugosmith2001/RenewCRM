-- Phase 3C: DSAR erasure/anonymization/restriction support
-- Adds durable restriction markers and DSAR execution action types.

-- AlterEnum
ALTER TYPE "DsarActionType" ADD VALUE IF NOT EXISTS 'EXECUTION_STARTED';
ALTER TYPE "DsarActionType" ADD VALUE IF NOT EXISTS 'EXECUTION_COMPLETED';
ALTER TYPE "DsarActionType" ADD VALUE IF NOT EXISTS 'EXECUTION_FAILED';

-- AlterTable: User
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "restrictedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "restrictedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "restrictionReason" TEXT;

-- AlterTable: Customer
ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "restrictedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "restrictedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "restrictionReason" TEXT;

-- AlterTable: CustomerContact
ALTER TABLE "CustomerContact"
ADD COLUMN IF NOT EXISTS "restrictedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "restrictedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "restrictionReason" TEXT;

