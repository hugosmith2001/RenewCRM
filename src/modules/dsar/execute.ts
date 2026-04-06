/**
 * DSAR execution – Phase 3D.
 * Executes RESTRICT and ERASE requests with explicit, audited transitions.
 *
 * Notes:
 * - This is an operational workflow helper. It is not a substitute for retention/legal hold policies.
 * - Audit/log metadata must remain IDs-only.
 */
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/modules/audit";
import { transitionDsarStatus } from "@/modules/dsar/service";
import { deleteDocument, listDocumentsByCustomerId } from "@/modules/documents";
import type { SessionUser } from "@/modules/auth";
import type { DsarSubjectType } from "@prisma/client";

type ExecutionInput = {
  reason?: string | null;
};

function erasedEmailForUser(userId: string): string {
  return `erased+${userId}@example.invalid`;
}

async function loadApprovedRequestOrThrow(operator: SessionUser, dsarRequestId: string) {
  const req = await prisma.dsarRequest.findFirst({
    where: { id: dsarRequestId, tenantId: operator.tenantId },
    select: { id: true, tenantId: true, requestType: true, status: true, subjectType: true, subjectRefId: true },
  });
  if (!req) throw new Error("DsarRequestNotFound");
  if (req.status !== "APPROVED") throw new Error("DsarRequestNotApproved");
  return req;
}

async function recordExecutionAction(params: {
  tenantId: string;
  dsarRequestId: string;
  operatorUserId: string;
  actionType: "EXECUTION_STARTED" | "EXECUTION_COMPLETED" | "EXECUTION_FAILED";
  note?: string | null;
}) {
  await prisma.dsarRequestAction.create({
    data: {
      tenantId: params.tenantId,
      dsarRequestId: params.dsarRequestId,
      operatorUserId: params.operatorUserId,
      actionType: params.actionType,
      note: params.note ?? null,
    },
  });
}

export async function executeDsarRestriction(
  operator: SessionUser,
  dsarRequestId: string,
  input: ExecutionInput = {}
) {
  const req = await loadApprovedRequestOrThrow(operator, dsarRequestId);
  if (req.requestType !== "RESTRICT") throw new Error("DsarRequestNotRestrict");

  await transitionDsarStatus(operator, dsarRequestId, { status: "PROCESSING" });
  await recordExecutionAction({
    tenantId: operator.tenantId,
    dsarRequestId,
    operatorUserId: operator.id,
    actionType: "EXECUTION_STARTED",
    note: input.reason ?? null,
  });

  try {
    await restrictSubject(operator.tenantId, operator.id, req.subjectType, req.subjectRefId, input.reason ?? null);
    await recordExecutionAction({
      tenantId: operator.tenantId,
      dsarRequestId,
      operatorUserId: operator.id,
      actionType: "EXECUTION_COMPLETED",
      note: input.reason ?? null,
    });
    await transitionDsarStatus(operator, dsarRequestId, { status: "COMPLETED" });

    await logAuditEvent({
      tenantId: operator.tenantId,
      userId: operator.id,
      action: "UPDATE",
      entityType: "DsarRequest",
      entityId: dsarRequestId,
      metadata: {
        dsarRequestId,
        requestType: "RESTRICT",
        subjectType: req.subjectType,
        subjectId: req.subjectRefId,
        status: "COMPLETED",
        actionType: "RESTRICTION_APPLIED",
      },
    });

    return { ok: true as const };
  } catch (err) {
    await recordExecutionAction({
      tenantId: operator.tenantId,
      dsarRequestId,
      operatorUserId: operator.id,
      actionType: "EXECUTION_FAILED",
      note: err instanceof Error ? err.message : "ExecutionFailed",
    });
    try {
      await transitionDsarStatus(operator, dsarRequestId, { status: "FAILED" });
    } catch {
      // ignore
    }
    throw err;
  }
}

export async function executeDsarErasure(
  operator: SessionUser,
  dsarRequestId: string,
  input: ExecutionInput = {}
) {
  const req = await loadApprovedRequestOrThrow(operator, dsarRequestId);
  if (req.requestType !== "ERASE") throw new Error("DsarRequestNotErase");

  await transitionDsarStatus(operator, dsarRequestId, { status: "PROCESSING" });
  await recordExecutionAction({
    tenantId: operator.tenantId,
    dsarRequestId,
    operatorUserId: operator.id,
    actionType: "EXECUTION_STARTED",
    note: input.reason ?? null,
  });

  try {
    await eraseOrAnonymizeSubject(operator.tenantId, operator.id, req.subjectType, req.subjectRefId, input.reason ?? null);
    await recordExecutionAction({
      tenantId: operator.tenantId,
      dsarRequestId,
      operatorUserId: operator.id,
      actionType: "EXECUTION_COMPLETED",
      note: input.reason ?? null,
    });
    await transitionDsarStatus(operator, dsarRequestId, { status: "COMPLETED" });

    await logAuditEvent({
      tenantId: operator.tenantId,
      userId: operator.id,
      action: "UPDATE",
      entityType: "DsarRequest",
      entityId: dsarRequestId,
      metadata: {
        dsarRequestId,
        requestType: "ERASE",
        subjectType: req.subjectType,
        subjectId: req.subjectRefId,
        status: "COMPLETED",
        actionType: "ERASURE_EXECUTED",
      },
    });

    return { ok: true as const };
  } catch (err) {
    await recordExecutionAction({
      tenantId: operator.tenantId,
      dsarRequestId,
      operatorUserId: operator.id,
      actionType: "EXECUTION_FAILED",
      note: err instanceof Error ? err.message : "ExecutionFailed",
    });
    try {
      await transitionDsarStatus(operator, dsarRequestId, { status: "FAILED" });
    } catch {
      // ignore
    }
    throw err;
  }
}

async function restrictSubject(
  tenantId: string,
  operatorUserId: string,
  subjectType: DsarSubjectType,
  subjectRefId: string,
  reason: string | null
) {
  const common = {
    restrictedAt: new Date(),
    restrictedByUserId: operatorUserId,
    restrictionReason: reason,
  };

  if (subjectType === "CUSTOMER") {
    const updated = await prisma.customer.updateMany({
      where: { tenantId, id: subjectRefId },
      data: common,
    });
    if (updated.count !== 1) throw new Error("SubjectNotFound");
    return;
  }
  if (subjectType === "CONTACT") {
    const updated = await prisma.customerContact.updateMany({
      where: { tenantId, id: subjectRefId },
      data: common,
    });
    if (updated.count !== 1) throw new Error("SubjectNotFound");
    return;
  }
  if (subjectType === "USER") {
    const updated = await prisma.user.updateMany({
      where: { tenantId, id: subjectRefId },
      data: common,
    });
    if (updated.count !== 1) throw new Error("SubjectNotFound");
    return;
  }

  const _never: never = subjectType;
  return _never;
}

async function eraseOrAnonymizeSubject(
  tenantId: string,
  operatorUserId: string,
  subjectType: DsarSubjectType,
  subjectRefId: string,
  reason: string | null
) {
  if (subjectType === "CUSTOMER") {
    const docs = await listDocumentsByCustomerId(tenantId, subjectRefId);
    for (const d of docs) {
      await deleteDocument(tenantId, d.id);
    }

    // Best-effort redact free text first; it can contain sensitive data.
    await prisma.activity.updateMany({ where: { tenantId, customerId: subjectRefId }, data: { subject: null, body: null } });
    await prisma.task.updateMany({ where: { tenantId, customerId: subjectRefId }, data: { description: null } });

    // Anonymize direct identifiers; retain record for referential integrity.
    const updated = await prisma.customer.updateMany({
      where: { tenantId, id: subjectRefId },
      data: {
        name: "[ERASED]",
        email: null,
        phone: null,
        address: null,
        restrictedAt: new Date(),
        restrictedByUserId: operatorUserId,
        restrictionReason: reason ?? "DSAR erasure/anonymization",
      },
    });
    if (updated.count !== 1) throw new Error("SubjectNotFound");

    // Anonymize linked contacts (same customer scope).
    await prisma.customerContact.updateMany({
      where: { tenantId, customerId: subjectRefId },
      data: {
        name: "[ERASED]",
        email: null,
        phone: null,
        title: null,
        restrictedAt: new Date(),
        restrictedByUserId: operatorUserId,
        restrictionReason: reason ?? "DSAR erasure/anonymization",
      },
    });
    return;
  }

  if (subjectType === "CONTACT") {
    const updated = await prisma.customerContact.updateMany({
      where: { tenantId, id: subjectRefId },
      data: {
        name: "[ERASED]",
        email: null,
        phone: null,
        title: null,
        restrictedAt: new Date(),
        restrictedByUserId: operatorUserId,
        restrictionReason: reason ?? "DSAR erasure/anonymization",
      },
    });
    if (updated.count !== 1) throw new Error("SubjectNotFound");
    return;
  }

  if (subjectType === "USER") {
    const updated = await prisma.user.updateMany({
      where: { tenantId, id: subjectRefId },
      data: {
        name: null,
        email: erasedEmailForUser(subjectRefId),
        isActive: false,
        restrictedAt: new Date(),
        restrictedByUserId: operatorUserId,
        restrictionReason: reason ?? "DSAR erasure/anonymization",
        sessionVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) throw new Error("SubjectNotFound");
    return;
  }

  const _never: never = subjectType;
  return _never;
}

