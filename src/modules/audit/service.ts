/**
 * Audit service – Phase 8.
 * Logs create, update, upload (and delete) actions for compliance and debugging.
 */
import { prisma } from "@/lib/db";
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

/**
 * Log an audit event. Does not throw; failures are logged to console.
 * Call after successful create/update/upload/delete in API routes.
 */
export async function logAuditEvent(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to log audit event:", err);
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
