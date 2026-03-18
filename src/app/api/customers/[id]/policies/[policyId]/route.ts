import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import {
  getPolicyById,
  updatePolicy,
  deletePolicy,
} from "@/modules/policies";
import { logAuditEvent } from "@/modules/audit";
import { updatePolicySchema } from "@/lib/validations/policies";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string; policyId: string }> };

function serializePolicy(policy: { premium?: unknown; [k: string]: unknown }) {
  const { premium, ...rest } = policy;
  return {
    ...rest,
    premium: premium != null ? Number(premium) : null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const { id: customerId, policyId } = await params;
    const policy = await getPolicyById(user.tenantId, policyId);
    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }
    if (policy.customerId !== customerId) {
      return NextResponse.json(
        { error: "Policy does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, policy.tenantId);
    const out = {
      ...policy,
      insuredObjectIds:
        policy.insuredObjects?.map((o) => o.insuredObject.id) ?? [],
    };
    return NextResponse.json(serializePolicy(out));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId, policyId } = await params;
    const policy = await getPolicyById(user.tenantId, policyId);
    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }
    if (policy.customerId !== customerId) {
      return NextResponse.json(
        { error: "Policy does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, policy.tenantId);
    const body = await request.json();
    const parsed = updatePolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await updatePolicy(user.tenantId, policyId, parsed.data);
    if (updated) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "Policy",
        entityId: policyId,
        metadata: { policyNumber: updated.policyNumber },
      });
    }
    return NextResponse.json(serializePolicy(updated!));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId, policyId } = await params;
    const policy = await getPolicyById(user.tenantId, policyId);
    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    }
    if (policy.customerId !== customerId) {
      return NextResponse.json(
        { error: "Policy does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, policy.tenantId);
    await deletePolicy(user.tenantId, policyId);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "Policy",
      entityId: policyId,
      metadata: { policyNumber: policy.policyNumber },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
