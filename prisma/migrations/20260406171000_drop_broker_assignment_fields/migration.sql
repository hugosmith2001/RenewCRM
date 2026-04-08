-- Drop broker assignment fields (solo broker mode)

ALTER TABLE "Task" DROP COLUMN IF EXISTS "assignedToUserId";
DROP INDEX IF EXISTS "Task_assignedToUserId_idx";

ALTER TABLE "Customer" DROP COLUMN IF EXISTS "ownerBrokerId";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_ownerBrokerId_fkey";

