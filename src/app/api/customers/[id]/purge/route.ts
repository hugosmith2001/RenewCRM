import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { logAuditEvent } from "@/modules/audit";
import { handleApiError } from "@/lib/api-error";
import { purgeCustomerNow } from "@/modules/retention/service";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function toBlockedResponse(reason: string): NextResponse {
  if (reason === "restricted") {
    return NextResponse.json({ error: "Customer is restricted" }, { status: 423 });
  }
  if (reason === "legal_hold" || reason === "document_legal_hold") {
    return NextResponse.json({ error: "Customer is on legal hold" }, { status: 409 });
  }
  return NextResponse.json({ error: "Purge failed" }, { status: 500 });
}

export const preferredRegion = "arn1";

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, tenantId: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, customer.tenantId);

    const result = await purgeCustomerNow({ tenantId: user.tenantId, customerId: id });
    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      return toBlockedResponse(result.reason);
    }

    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "Customer",
      entityId: id,
      metadata: { actionType: "purge_now" },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}

