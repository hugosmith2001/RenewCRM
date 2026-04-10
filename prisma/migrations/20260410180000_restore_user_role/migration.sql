-- Restore user roles (ADMIN / BROKER / STAFF) for access control.

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'BROKER', 'STAFF');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';
