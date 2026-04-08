-- Drop roles (solo broker mode)
-- Safe on DBs that already removed the column/type.

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "Role";

