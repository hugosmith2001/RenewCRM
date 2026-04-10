-- Solo-broker: remove User.role and UserRole enum (Phase 1 — DB only; schema updated in a follow-up migration).

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

DROP TYPE IF EXISTS "UserRole";
