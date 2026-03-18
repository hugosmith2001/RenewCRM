import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import {
  listInsuredObjectsByCustomerId,
  createInsuredObject,
} from "@/modules/insured-objects";
import { logAuditEvent } from "@/modules/audit";
import { createInsuredObjectSchema } from "@/lib/validations/insured-objects";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, customer.tenantId);
    const objects = await listInsuredObjectsByCustomerId(user.tenantId, customerId);
    return NextResponse.json(objects);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, customer.tenantId);
    const body = await request.json();
    const parsed = createInsuredObjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const obj = await createInsuredObject(user.tenantId, customerId, parsed.data);
    if (!obj) {
      return NextResponse.json(
        { error: "Failed to create insured object" },
        { status: 400 }
      );
    }
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "InsuredObject",
      entityId: obj.id,
      metadata: { name: obj.name, type: obj.type },
    });
    return NextResponse.json(obj, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
