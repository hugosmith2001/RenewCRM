/**
 * DSAR workflow service – Phase 3A.
 * Centralizes DSAR request lifecycle, subject validation, and audit alignment.
 */
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/modules/audit";
import type { SessionUser } from "@/modules/auth";
import type {
  CreateDsarRequestInput,
  ListDsarRequestsQuery,
  UpdateDsarStatusInput,
} from "@/lib/validations/dsar";
import type { DsarRequest, DsarStatus, Prisma } from "@prisma/client";

export type DsarRequestSummary = Pick<
  DsarRequest,
  | "id"
  | "tenantId"
  | "requestType"
  | "subjectType"
  | "subjectRefId"
  | "status"
  | "createdByUserId"
  | "updatedByUserId"
  | "createdAt"
  | "updatedAt"
>;

export type DsarRequestDetail = DsarRequestSummary & {
  notes: string | null;
  actions: Array<{
    id: string;
    actionType: string;
    operatorUserId: string;
    fromStatus: DsarStatus | null;
    toStatus: DsarStatus | null;
    note: string | null;
    createdAt: Date;
  }>;
};

const ALLOWED_STATUS_TRANSITIONS: Record<DsarStatus, Set<DsarStatus>> = {
  PENDING: new Set(["IN_REVIEW", "REJECTED"]),
  IN_REVIEW: new Set(["APPROVED", "REJECTED"]),
  APPROVED: new Set(["PROCESSING"]),
  PROCESSING: new Set(["COMPLETED", "FAILED"]),
  FAILED: new Set(["PROCESSING", "REJECTED"]),
  COMPLETED: new Set([]),
  REJECTED: new Set([]),
};

async function assertSubjectExists(tenantId: string, subjectType: CreateDsarRequestInput["subjectType"], subjectRefId: string) {
  if (subjectType === "CUSTOMER") {
    const exists = await prisma.customer.findFirst({ where: { id: subjectRefId, tenantId }, select: { id: true } });
    if (!exists) throw new Error("SubjectNotFound");
    return;
  }
  if (subjectType === "CONTACT") {
    const exists = await prisma.customerContact.findFirst({ where: { id: subjectRefId, tenantId }, select: { id: true } });
    if (!exists) throw new Error("SubjectNotFound");
    return;
  }
  if (subjectType === "USER") {
    const exists = await prisma.user.findFirst({ where: { id: subjectRefId, tenantId }, select: { id: true } });
    if (!exists) throw new Error("SubjectNotFound");
    return;
  }

  // Should be unreachable (subjectType is validated upstream), but keep runtime safety.
  throw new Error("InvalidSubjectType");
}

export async function createDsarRequest(operator: SessionUser, input: CreateDsarRequestInput): Promise<DsarRequestDetail> {
  await assertSubjectExists(operator.tenantId, input.subjectType, input.subjectRefId);

  const created = await prisma.$transaction(async (tx) => {
    const req = await tx.dsarRequest.create({
      data: {
        tenantId: operator.tenantId,
        requestType: input.requestType,
        subjectType: input.subjectType,
        subjectRefId: input.subjectRefId,
        status: "PENDING",
        createdByUserId: operator.id,
        updatedByUserId: operator.id,
        notes: input.notes ?? null,
        actions: {
          create: [
            {
              tenantId: operator.tenantId,
              operatorUserId: operator.id,
              actionType: "CREATED",
              toStatus: "PENDING",
              note: input.notes ?? null,
            },
          ],
        },
      },
      select: {
        id: true,
        tenantId: true,
        requestType: true,
        subjectType: true,
        subjectRefId: true,
        status: true,
        createdByUserId: true,
        updatedByUserId: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        actions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            actionType: true,
            operatorUserId: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    return req;
  });

  await logAuditEvent({
    tenantId: operator.tenantId,
    userId: operator.id,
    action: "CREATE",
    entityType: "DsarRequest",
    entityId: created.id,
    metadata: {
      dsarRequestId: created.id,
      requestType: created.requestType,
      subjectType: created.subjectType,
      subjectId: created.subjectRefId,
      status: created.status,
      actionType: "CREATED",
    },
  });

  return created as DsarRequestDetail;
}

export async function listDsarRequests(
  operator: SessionUser,
  query: ListDsarRequestsQuery
): Promise<{ requests: DsarRequestSummary[]; total: number }> {
  const { status, requestType, subjectType, subjectRefId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.DsarRequestWhereInput = {
    tenantId: operator.tenantId,
    ...(status ? { status } : {}),
    ...(requestType ? { requestType } : {}),
    ...(subjectType ? { subjectType } : {}),
    ...(subjectRefId ? { subjectRefId } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.dsarRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        tenantId: true,
        requestType: true,
        subjectType: true,
        subjectRefId: true,
        status: true,
        createdByUserId: true,
        updatedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.dsarRequest.count({ where }),
  ]);

  return { requests: requests as DsarRequestSummary[], total };
}

export async function getDsarRequestById(operator: SessionUser, dsarRequestId: string): Promise<DsarRequestDetail | null> {
  const req = await prisma.dsarRequest.findFirst({
    where: { id: dsarRequestId, tenantId: operator.tenantId },
    select: {
      id: true,
      tenantId: true,
      requestType: true,
      subjectType: true,
      subjectRefId: true,
      status: true,
      createdByUserId: true,
      updatedByUserId: true,
      createdAt: true,
      updatedAt: true,
      notes: true,
      actions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          actionType: true,
          operatorUserId: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });

  return (req as DsarRequestDetail | null) ?? null;
}

export async function transitionDsarStatus(
  operator: SessionUser,
  dsarRequestId: string,
  input: UpdateDsarStatusInput
): Promise<DsarRequestDetail | null> {
  const existing = await prisma.dsarRequest.findFirst({
    where: { id: dsarRequestId, tenantId: operator.tenantId },
    select: {
      id: true,
      status: true,
      requestType: true,
      subjectType: true,
      subjectRefId: true,
    },
  });
  if (!existing) return null;

  const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status]?.has(input.status) ?? false;
  if (!allowed) {
    throw new Error("InvalidStatusTransition");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.dsarRequestAction.create({
      data: {
        tenantId: operator.tenantId,
        dsarRequestId,
        operatorUserId: operator.id,
        actionType: "STATUS_CHANGED",
        fromStatus: existing.status,
        toStatus: input.status,
        note: input.note ?? null,
      },
    });

    return tx.dsarRequest.update({
      where: { id: dsarRequestId },
      data: {
        status: input.status,
        updatedByUserId: operator.id,
        ...(input.note !== undefined ? { notes: input.note ?? null } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        requestType: true,
        subjectType: true,
        subjectRefId: true,
        status: true,
        createdByUserId: true,
        updatedByUserId: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        actions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            actionType: true,
            operatorUserId: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });
  });

  await logAuditEvent({
    tenantId: operator.tenantId,
    userId: operator.id,
    action: "UPDATE",
    entityType: "DsarRequest",
    entityId: dsarRequestId,
    metadata: {
      dsarRequestId,
      requestType: existing.requestType,
      subjectType: existing.subjectType,
      subjectId: existing.subjectRefId,
      status: input.status,
      actionType: "STATUS_CHANGED",
    },
  });

  return updated as DsarRequestDetail;
}

