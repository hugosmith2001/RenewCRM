import type { RetentionCategory } from "@prisma/client";

/**
 * System default retention policies (apply even when a tenant never configures overrides).
 *
 * Chosen to be defensible for an insurance CRM while minimizing retention risk:
 * - Inactive customer records: 7 years from last activity/interaction marker
 * - Documents after policy end: 7 years after policy end date
 * - Audit events: 2 years for security/traceability (IDs-only metadata already enforced)
 *
 * Application logs are not enforced in-app; see docs/RETENTION_AND_PURGE.md for ops requirements.
 */
export const SYSTEM_DEFAULT_RETENTION_DAYS: Record<RetentionCategory, number> = {
  INACTIVE_CUSTOMER: 365 * 7,
  DOCUMENT_POST_POLICY_END: 365 * 7,
  AUDIT_EVENT: 365 * 2,
};

/**
 * Guardrails for tenant overrides. Tenants/controllers may shorten or lengthen within bounds.
 * (Some deployments may require longer retention; do not allow "infinite".)
 */
export const RETENTION_OVERRIDE_BOUNDS_DAYS: Record<
  RetentionCategory,
  { minDays: number; maxDays: number }
> = {
  INACTIVE_CUSTOMER: { minDays: 365, maxDays: 365 * 15 },
  DOCUMENT_POST_POLICY_END: { minDays: 365, maxDays: 365 * 15 },
  AUDIT_EVENT: { minDays: 30, maxDays: 365 * 7 },
};

