export type RestrictedEntity = {
  restrictedAt: Date | null;
};

/**
 * Restriction of processing is enforced as:
 * - Solo broker mode: restricted entities are blocked.
 */
export function isBlockedByRestriction(entity: RestrictedEntity | null | undefined): boolean {
  if (!entity?.restrictedAt) return false;
  return true;
}

