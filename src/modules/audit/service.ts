/**
 * Audit service – Phase 8.
 * Logs create, update, upload (and delete) actions for compliance and debugging.
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { AuditAction as PrismaAuditAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type AuditEntityType =
  | "Customer"
  | "CustomerContact"
  | "InsuredObject"
  | "Insurer"
  | "Policy"
  | "Document"
  | "Activity"
  | "Task";

export type LogAuditInput = {
  tenantId: string;
  userId: string;
  action: PrismaAuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
};

type AllowedAuditMetadataValue = string | number | boolean | null;

const ALLOWED_AUDIT_METADATA_KEYS = new Set([
  // IDs
  "tenantId",
  "userId",
  "customerId",
  "contactId",
  "policyId",
  "documentId",
  "taskId",
  "activityId",
  "insurerId",
  "objectId",
  "subjectId",
  // Non-PII enums/flags
  "status",
  "type",
  "documentType",
  "isPrimary",
  "actionType",
]);

function sanitizeAuditMetadata(metadata: Record<string, unknown> | undefined): Record<string, AllowedAuditMetadataValue> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, AllowedAuditMetadataValue> = {};

  for (const [k, v] of Object.entries(metadata)) {
    if (!ALLOWED_AUDIT_METADATA_KEYS.has(k)) continue;
    if (v === null) {
      out[k] = null;
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Log an audit event. Does not throw; failures are logged to console.
 * Call after successful create/update/upload/delete in API routes.
 */
export async function logAuditEvent(input: LogAuditInput): Promise<void> {
  try {
    const safeMetadata = sanitizeAuditMetadata(input.metadata);
    await prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (safeMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    logger.error("Failed to write audit event", {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      err,
    });
  }
}

export type ListAuditQuery = {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: PrismaAuditAction;
  page?: number;
  limit?: number;
};

export type AuditEventWithIds = {
  id: string;
  tenantId: string;
  userId: string;
  action: PrismaAuditAction;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
};

/**
 * List audit events for a tenant. Enforces tenant isolation.
 */
export async function listAuditEvents(
  tenantId: string,
  query: ListAuditQuery = {}
): Promise<{ events: AuditEventWithIds[]; total: number }> {
  const { entityType, entityId, action, page = 1, limit = 50 } = query;
  const skip = (page - 1) * limit;

  const where: { tenantId: string; entityType?: string; entityId?: string; action?: PrismaAuditAction } = {
    tenantId,
  };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return {
    events: events as AuditEventWithIds[],
    total,
  };
}
