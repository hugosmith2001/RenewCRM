import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { storageDelete } from "@/lib/storage";
import { getRetentionPolicyForTenant } from "@/modules/retention/overrides";
import type { PurgeCandidate, PurgeExecutionResult } from "@/modules/retention/types";
import type { RetentionCategory } from "@prisma/client";

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function isOnOrBefore(a: Date, b: Date): boolean {
  return a.getTime() <= b.getTime();
}

function isBlockedByHold(entity: { legalHold: boolean; restrictedAt: Date | null }): "legal_hold" | "restricted" | null {
  if (entity.legalHold) return "legal_hold";
  if (entity.restrictedAt) return "restricted";
  return null;
}

async function getCustomerAnchorAt(tenantId: string, customerId: string): Promise<Date | null> {
  // "Inactivity" anchor is the most recent of:
  // - customer.updatedAt (edits)
  // - latest activity.createdAt (interactions)
  // - latest document.createdAt (uploads)
  // - latest policy.updatedAt (policy changes)
  //
  // Note: Tasks do not currently have timestamps; they are not included.
  const [customer, lastActivity, lastDoc, lastPolicy] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { updatedAt: true },
    }),
    prisma.activity.aggregate({
      where: { tenantId, customerId },
      _max: { createdAt: true },
    }),
    prisma.document.aggregate({
      where: { tenantId, customerId },
      _max: { createdAt: true },
    }),
    prisma.policy.aggregate({
      where: { tenantId, customerId },
      _max: { updatedAt: true },
    }),
  ]);

  if (!customer) return null;
  const candidates: Array<Date> = [customer.updatedAt];
  if (lastActivity._max.createdAt) candidates.push(lastActivity._max.createdAt);
  if (lastDoc._max.createdAt) candidates.push(lastDoc._max.createdAt);
  if (lastPolicy._max.updatedAt) candidates.push(lastPolicy._max.updatedAt);
  return candidates.reduce((max, cur) => (cur.getTime() > max.getTime() ? cur : max));
}

export async function listPurgeCandidatesForTenant(input: {
  tenantId: string;
  asOf?: Date;
  limit?: number;
}): Promise<PurgeCandidate[]> {
  const asOf = input.asOf ?? new Date();
  const limit = input.limit ?? 200;

  const [inactiveCustomerPolicy, docPolicy, auditPolicy] = await Promise.all([
    getRetentionPolicyForTenant(input.tenantId, "INACTIVE_CUSTOMER"),
    getRetentionPolicyForTenant(input.tenantId, "DOCUMENT_POST_POLICY_END"),
    getRetentionPolicyForTenant(input.tenantId, "AUDIT_EVENT"),
  ]);

  const candidates: PurgeCandidate[] = [];

  // Customers: explicitly deleted (soft delete) OR marked INACTIVE.
  const customerRows = await prisma.customer.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [{ deletedAt: { not: null } }, { status: "INACTIVE" }],
    },
    select: { id: true, deletedAt: true, legalHold: true, restrictedAt: true },
    orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  for (const c of customerRows) {
    const hold = isBlockedByHold({ legalHold: c.legalHold, restrictedAt: c.restrictedAt });
    if (hold) {
      // If held, still surface as candidate (blocked), so ops can see what is accumulating.
      const anchor = c.deletedAt ?? (await getCustomerAnchorAt(input.tenantId, c.id));
      if (!anchor) continue;
      candidates.push({
        kind: "customer",
        tenantId: input.tenantId,
        id: c.id,
        category: "INACTIVE_CUSTOMER",
        anchorAt: anchor,
        eligibleAt: addDays(anchor, inactiveCustomerPolicy.retentionDays),
        blockedBy: hold,
      });
      continue;
    }

    const anchorAt = c.deletedAt ?? (await getCustomerAnchorAt(input.tenantId, c.id));
    if (!anchorAt) continue;

    const eligibleAt = addDays(anchorAt, inactiveCustomerPolicy.retentionDays);
    candidates.push({
      kind: "customer",
      tenantId: input.tenantId,
      id: c.id,
      category: "INACTIVE_CUSTOMER",
      anchorAt,
      eligibleAt,
      blockedBy: isOnOrBefore(eligibleAt, asOf) ? undefined : "not_expired",
    });
  }

  // Documents: soft-deleted OR policy-ended + retention period elapsed.
  const docs = await prisma.document.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [{ deletedAt: { not: null } }, { policy: { endDate: { not: null } } }],
    },
    select: {
      id: true,
      deletedAt: true,
      legalHold: true,
      policy: { select: { endDate: true } },
    },
    orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  for (const d of docs) {
    if (d.legalHold) {
      const anchor = d.deletedAt ?? d.policy?.endDate ?? null;
      if (!anchor) continue;
      candidates.push({
        kind: "document",
        tenantId: input.tenantId,
        id: d.id,
        category: "DOCUMENT_POST_POLICY_END",
        anchorAt: anchor,
        eligibleAt: addDays(anchor, docPolicy.retentionDays),
        blockedBy: "legal_hold",
      });
      continue;
    }

    const anchorAt = d.deletedAt ?? d.policy?.endDate ?? null;
    if (!anchorAt) {
      continue;
    }
    const eligibleAt = addDays(anchorAt, docPolicy.retentionDays);
    candidates.push({
      kind: "document",
      tenantId: input.tenantId,
      id: d.id,
      category: "DOCUMENT_POST_POLICY_END",
      anchorAt,
      eligibleAt,
      blockedBy: isOnOrBefore(eligibleAt, asOf) ? undefined : "not_expired",
    });
  }

  // Audit events: eligibleAt = createdAt + retentionDays.
  // We do not list individual audit event IDs as candidates here (volume), but purge execution
  // uses a date cutoff and returns counts only.
  //
  // We still return one synthetic candidate so callers can report the configured policy window.
  const auditAnchor = addDays(asOf, -auditPolicy.retentionDays);
  candidates.push({
    kind: "audit_event",
    tenantId: input.tenantId,
    id: "cutoff",
    category: "AUDIT_EVENT",
    anchorAt: auditAnchor,
    eligibleAt: asOf,
  });

  return candidates;
}

export async function executePurgeForTenant(input: {
  tenantId: string;
  asOf?: Date;
  customerLimit?: number;
  documentLimit?: number;
}): Promise<PurgeExecutionResult> {
  const asOf = input.asOf ?? new Date();
  const customerLimit = input.customerLimit ?? 200;
  const documentLimit = input.documentLimit ?? 500;

  const result: PurgeExecutionResult = {
    attempted: 0,
    deleted: 0,
    blocked: 0,
    failed: 0,
    failures: [],
  };

  const [inactiveCustomerPolicy, docPolicy, auditPolicy] = await Promise.all([
    getRetentionPolicyForTenant(input.tenantId, "INACTIVE_CUSTOMER"),
    getRetentionPolicyForTenant(input.tenantId, "DOCUMENT_POST_POLICY_END"),
    getRetentionPolicyForTenant(input.tenantId, "AUDIT_EVENT"),
  ]);

  // 1) Purge documents first (so customer cascades do not strand blobs).
  const docs = await prisma.document.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [{ deletedAt: { not: null } }, { policy: { endDate: { not: null } } }],
      legalHold: false,
    },
    select: {
      id: true,
      deletedAt: true,
      storageKey: true,
      policy: { select: { endDate: true } },
    },
    take: documentLimit,
    orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
  });

  for (const d of docs) {
    const anchorAt = d.deletedAt ?? d.policy?.endDate ?? null;
    if (!anchorAt) continue;
    const eligibleAt = addDays(anchorAt, docPolicy.retentionDays);
    if (!isOnOrBefore(eligibleAt, asOf)) continue;

    result.attempted += 1;
    try {
      await storageDelete(d.storageKey);
    } catch (err) {
      result.failed += 1;
      result.failures.push({ kind: "document", tenantId: input.tenantId, id: d.id, reason: "storage_delete_failed" });
      logger.error("Retention purge: document storage delete failed", {
        tenantId: input.tenantId,
        documentId: d.id,
        err,
      });
      continue;
    }

    try {
      await prisma.document.delete({ where: { id: d.id } });
      result.deleted += 1;
    } catch (err) {
      result.failed += 1;
      result.failures.push({ kind: "document", tenantId: input.tenantId, id: d.id, reason: "db_delete_failed" });
      logger.error("Retention purge: document DB delete failed", {
        tenantId: input.tenantId,
        documentId: d.id,
        err,
      });
    }
  }

  // 2) Purge customers (hard delete) when eligible.
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [{ deletedAt: { not: null } }, { status: "INACTIVE" }],
    },
    select: { id: true, deletedAt: true, legalHold: true, restrictedAt: true },
    take: customerLimit,
    orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
  });

  for (const c of customers) {
    const hold = isBlockedByHold({ legalHold: c.legalHold, restrictedAt: c.restrictedAt });
    if (hold) {
      result.blocked += 1;
      continue;
    }

    const anchorAt = c.deletedAt ?? (await getCustomerAnchorAt(input.tenantId, c.id));
    if (!anchorAt) {
      result.blocked += 1;
      continue;
    }

    const eligibleAt = addDays(anchorAt, inactiveCustomerPolicy.retentionDays);
    if (!isOnOrBefore(eligibleAt, asOf)) continue;

    // Safety: delete all document blobs for this customer before cascading delete.
    const docsForCustomer = await prisma.document.findMany({
      where: { tenantId: input.tenantId, customerId: c.id },
      select: { id: true, storageKey: true, legalHold: true },
    });

    if (docsForCustomer.some((d) => d.legalHold)) {
      result.blocked += 1;
      continue;
    }

    result.attempted += 1;

    let storageOk = true;
    for (const d of docsForCustomer) {
      try {
        await storageDelete(d.storageKey);
      } catch (err) {
        storageOk = false;
        logger.error("Retention purge: customer document storage delete failed", {
          tenantId: input.tenantId,
          customerId: c.id,
          documentId: d.id,
          err,
        });
        result.failed += 1;
        result.failures.push({
          kind: "customer",
          tenantId: input.tenantId,
          id: c.id,
          reason: "storage_delete_failed",
        });
        break;
      }
    }
    if (!storageOk) continue;

    try {
      await prisma.customer.delete({ where: { id: c.id } });
      result.deleted += 1;
    } catch (err) {
      result.failed += 1;
      result.failures.push({ kind: "customer", tenantId: input.tenantId, id: c.id, reason: "db_delete_failed" });
      logger.error("Retention purge: customer DB delete failed", {
        tenantId: input.tenantId,
        customerId: c.id,
        err,
      });
    }
  }

  // 3) Purge audit events by cutoff.
  const cutoff = addDays(asOf, -auditPolicy.retentionDays);
  try {
    const deleted = await prisma.auditEvent.deleteMany({
      where: { tenantId: input.tenantId, createdAt: { lt: cutoff } },
    });
    if (deleted.count > 0) {
      logger.info("Retention purge: audit events deleted", {
        tenantId: input.tenantId,
        count: deleted.count,
        cutoff: cutoff.toISOString(),
        category: "AUDIT_EVENT" as RetentionCategory,
      });
    }
  } catch (err) {
    result.failed += 1;
    result.failures.push({ kind: "audit_event", tenantId: input.tenantId, id: "cutoff", reason: "db_delete_failed" });
    logger.error("Retention purge: audit event deleteMany failed", {
      tenantId: input.tenantId,
      err,
    });
  }

  return result;
}

