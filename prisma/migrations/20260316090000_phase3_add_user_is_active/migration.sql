-- Phase 3: Add isActive to User
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE;
