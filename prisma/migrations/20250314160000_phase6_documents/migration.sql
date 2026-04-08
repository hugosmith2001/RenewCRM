-- Phase 6: Documents

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('POLICY_DOCUMENT', 'CONTRACT', 'ID_DOCUMENT', 'CORRESPONDENCE', 'OTHER');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "policyId" TEXT,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_customerId_idx" ON "Document"("customerId");

-- CreateIndex
CREATE INDEX "Document_policyId_idx" ON "Document"("policyId");

-- CreateIndex
CREATE INDEX "Document_tenantId_deletedAt_idx" ON "Document"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Document_tenantId_legalHold_idx" ON "Document"("tenantId", "legalHold");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

