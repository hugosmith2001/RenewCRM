-- Phase 3B: DSAR exports (access/portability artifacts)
-- Stores structured JSON + optional CSV summaries for an approved DSAR request.

-- CreateEnum
CREATE TYPE "DsarExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "DsarExport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dsarRequestId" TEXT NOT NULL,
    "status" "DsarExportStatus" NOT NULL DEFAULT 'PENDING',
    "formatVersion" INTEGER NOT NULL DEFAULT 1,
    "includeFiles" BOOLEAN NOT NULL DEFAULT false,
    "exportJson" JSONB,
    "exportCsv" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DsarExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DsarExport_dsarRequestId_key" ON "DsarExport"("dsarRequestId");

-- CreateIndex
CREATE INDEX "DsarExport_tenantId_idx" ON "DsarExport"("tenantId");

-- CreateIndex
CREATE INDEX "DsarExport_tenantId_status_idx" ON "DsarExport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DsarExport_tenantId_completedAt_idx" ON "DsarExport"("tenantId", "completedAt");

-- AddForeignKey
ALTER TABLE "DsarExport" ADD CONSTRAINT "DsarExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DsarExport" ADD CONSTRAINT "DsarExport_dsarRequestId_fkey" FOREIGN KEY ("dsarRequestId") REFERENCES "DsarRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

