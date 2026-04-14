import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import {
  listPoliciesByCustomerId,
  createPolicy,
} from "@/modules/policies";
import { logAuditEvent } from "@/modules/audit";
import { createPolicySchema } from "@/lib/validations/policies";
import { handleApiError } from "@/lib/api-error";
import { revalidateCustomerDetailCaches } from "@/lib/revalidate";

type Params = { params: Promise<{ id: string }> };

function serializePolicy(policy: { premium?: unknown; [k: string]: unknown }) {
  const { premium, ...rest } = policy;
  return {
    ...rest,
    premium: premium != null ? Number(premium) : null,
  };
}

export const preferredRegion = "arn1";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    assertTenantAccess(user, customer.tenantId);
    const policies = await listPoliciesByCustomerId(user.tenantId, customerId);
    return NextResponse.json(policies.map((p) => serializePolicy(p)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    assertTenantAccess(user, customer.tenantId);
    const body = await request.json();
    const parsed = createPolicySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const policy = await createPolicy(user.tenantId, customerId, parsed.data);
    if (!policy) {
      return NextResponse.json(
        { error: "Failed to create policy (invalid customer or insurer)" },
        { status: 400 }
      );
    }
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "Policy",
      entityId: policy.id,
      metadata: { customerId },
    });
    revalidateCustomerDetailCaches(user.tenantId, customerId);
    return NextResponse.json(serializePolicy(policy), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
