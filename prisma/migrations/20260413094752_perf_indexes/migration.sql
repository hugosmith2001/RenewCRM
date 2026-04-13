-- CreateIndex
CREATE INDEX "Activity_tenantId_customerId_createdAt_idx" ON "Activity"("tenantId", "customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Customer_tenantId_deletedAt_name_idx" ON "Customer"("tenantId", "deletedAt", "name");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_customerId_isPrimary_name_idx" ON "CustomerContact"("tenantId", "customerId", "isPrimary" DESC, "name");

-- CreateIndex
CREATE INDEX "Document_tenantId_deletedAt_createdAt_idx" ON "Document"("tenantId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Document_tenantId_customerId_deletedAt_createdAt_idx" ON "Document"("tenantId", "customerId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Document_tenantId_policyId_deletedAt_createdAt_idx" ON "Document"("tenantId", "policyId", "deletedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Policy_tenantId_customerId_endDate_createdAt_idx" ON "Policy"("tenantId", "customerId", "endDate" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Policy_tenantId_endDate_createdAt_idx" ON "Policy"("tenantId", "endDate" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Policy_tenantId_renewalDate_endDate_idx" ON "Policy"("tenantId", "renewalDate", "endDate" DESC);

-- CreateIndex
CREATE INDEX "Task_tenantId_status_dueDate_idx" ON "Task"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Task_tenantId_customerId_status_dueDate_idx" ON "Task"("tenantId", "customerId", "status", "dueDate");
