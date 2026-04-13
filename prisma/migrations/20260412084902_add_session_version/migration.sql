-- AlterTable
ALTER TABLE "User" ADD COLUMN     "restrictedAt" TIMESTAMP(3),
ADD COLUMN     "restrictedByUserId" TEXT,
ADD COLUMN     "restrictionReason" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Policy_tenantId_renewalDate_idx" ON "Policy"("tenantId", "renewalDate");
