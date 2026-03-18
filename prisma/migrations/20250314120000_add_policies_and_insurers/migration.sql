-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateTable
CREATE TABLE "Insurer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "insurerId" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "premium" DECIMAL(12,2),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "renewalDate" DATE,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyInsuredObject" (
    "policyId" TEXT NOT NULL,
    "insuredObjectId" TEXT NOT NULL,

    CONSTRAINT "PolicyInsuredObject_pkey" PRIMARY KEY ("policyId","insuredObjectId")
);

-- CreateIndex
CREATE INDEX "Insurer_tenantId_idx" ON "Insurer"("tenantId");

-- CreateIndex
CREATE INDEX "Insurer_tenantId_name_idx" ON "Insurer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Policy_tenantId_idx" ON "Policy"("tenantId");

-- CreateIndex
CREATE INDEX "Policy_customerId_idx" ON "Policy"("customerId");

-- CreateIndex
CREATE INDEX "Policy_tenantId_status_idx" ON "Policy"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PolicyInsuredObject_insuredObjectId_idx" ON "PolicyInsuredObject"("insuredObjectId");

-- AddForeignKey
ALTER TABLE "Insurer" ADD CONSTRAINT "Insurer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_insurerId_fkey" FOREIGN KEY ("insurerId") REFERENCES "Insurer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyInsuredObject" ADD CONSTRAINT "PolicyInsuredObject_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyInsuredObject" ADD CONSTRAINT "PolicyInsuredObject_insuredObjectId_fkey" FOREIGN KEY ("insuredObjectId") REFERENCES "InsuredObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
