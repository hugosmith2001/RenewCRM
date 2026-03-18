import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import {
  listContactsByCustomerId,
  createContact,
} from "@/modules/contacts";
import { logAuditEvent } from "@/modules/audit";
import { createContactSchema } from "@/lib/validations/contacts";
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
    const contacts = await listContactsByCustomerId(user.tenantId, customerId);
    return NextResponse.json(contacts);
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
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const contact = await createContact(user.tenantId, customerId, parsed.data);
    if (!contact) {
      return NextResponse.json({ error: "Failed to create contact" }, { status: 400 });
    }
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "CustomerContact",
      entityId: contact.id,
      metadata: { name: contact.name, customerId },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
