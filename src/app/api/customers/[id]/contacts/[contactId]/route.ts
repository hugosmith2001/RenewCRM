import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { getContactById, updateContact, deleteContact } from "@/modules/contacts";
import { logAuditEvent } from "@/modules/audit";
import { updateContactSchema } from "@/lib/validations/contacts";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId, contactId } = await params;
    const contact = await getContactById(user.tenantId, contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.customerId !== customerId) {
      return NextResponse.json({ error: "Contact does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, contact.tenantId);
    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await updateContact(user.tenantId, contactId, parsed.data);
    if (updated) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "CustomerContact",
        entityId: contactId,
        metadata: { customerId },
      });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId, contactId } = await params;
    const contact = await getContactById(user.tenantId, contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.customerId !== customerId) {
      return NextResponse.json({ error: "Contact does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, contact.tenantId);
    await deleteContact(user.tenantId, contactId);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "CustomerContact",
      entityId: contactId,
      metadata: { customerId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
