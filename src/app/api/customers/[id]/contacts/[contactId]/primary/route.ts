import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getContactById, setPrimaryContact } from "@/modules/contacts";
import { logAuditEvent } from "@/modules/audit";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string; contactId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, contactId } = await params;
    const contact = await getContactById(user.tenantId, contactId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (contact.customerId !== customerId) {
      return NextResponse.json({ error: "Contact does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, contact.tenantId);
    const updated = await setPrimaryContact(user.tenantId, contactId);
    if (updated) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "CustomerContact",
        entityId: contactId,
        metadata: { customerId, isPrimary: true },
      });
    }
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
