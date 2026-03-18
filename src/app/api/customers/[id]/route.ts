import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { getCustomerById, updateCustomer, deleteCustomer } from "@/modules/customers";
import { logAuditEvent } from "@/modules/audit";
import { updateCustomerSchema } from "@/lib/validations/customers";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const { id } = await params;
    const customer = await getCustomerById(user.tenantId, id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, customer.tenantId);
    return NextResponse.json(customer);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id } = await params;
    const existing = await getCustomerById(user.tenantId, id);
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, existing.tenantId);
    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const customer = await updateCustomer(user.tenantId, id, parsed.data);
    if (customer) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "Customer",
        entityId: id,
        metadata: { name: customer.name },
      });
    }
    return NextResponse.json(customer);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id } = await params;
    const existing = await getCustomerById(user.tenantId, id);
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, existing.tenantId);
    await deleteCustomer(user.tenantId, id);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "Customer",
      entityId: id,
      metadata: { name: existing.name },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
