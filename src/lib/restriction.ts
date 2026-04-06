import type { Role } from "@prisma/client";

export type RestrictedEntity = {
  restrictedAt: Date | null;
};

/**
 * Restriction of processing is enforced as:
 * - ADMIN: can access restricted entities (for DSAR/legal hold operations)
 * - Non-admin: blocked from reading/updating restricted entities
 */
export function isBlockedByRestriction(role: Role, entity: RestrictedEntity | null | undefined): boolean {
  if (!entity?.restrictedAt) return false;
  return role !== "ADMIN";
}

