-- Phase 4: Retention + purge foundations
-- - Soft delete + legal hold fields for Customer + Document
-- - Tenant-scoped retention overrides
-- - Retention category enum

-- CreateEnum
CREATE TYPE "RetentionCategory" AS ENUM ('INACTIVE_CUSTOMER', 'DOCUMENT_POST_POLICY_END', 'AUDIT_EVENT');

-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Document"
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RetentionPolicyOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" "RetentionCategory" NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicyOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicyOverride_tenantId_category_key" ON "RetentionPolicyOverride"("tenantId", "category");

-- CreateIndex
CREATE INDEX "RetentionPolicyOverride_tenantId_idx" ON "RetentionPolicyOverride"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_deletedAt_idx" ON "Customer"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Customer_tenantId_legalHold_idx" ON "Customer"("tenantId", "legalHold");

-- CreateIndex
CREATE INDEX "Document_tenantId_deletedAt_idx" ON "Document"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Document_tenantId_legalHold_idx" ON "Document"("tenantId", "legalHold");

-- AddForeignKey
ALTER TABLE "RetentionPolicyOverride" ADD CONSTRAINT "RetentionPolicyOverride_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

