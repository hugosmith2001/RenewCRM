import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getDocumentById, deleteDocument } from "@/modules/documents";
import { logAuditEvent } from "@/modules/audit";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string; documentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, documentId } = await params;
    const doc = await getDocumentById(user.tenantId, documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    if (doc.customerId !== customerId) {
      return NextResponse.json(
        { error: "Document does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, doc.tenantId);
    return NextResponse.json(doc);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, documentId } = await params;
    const doc = await getDocumentById(user.tenantId, documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    if (doc.customerId !== customerId) {
      return NextResponse.json(
        { error: "Document does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, doc.tenantId);
    await deleteDocument(user.tenantId, documentId);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "Document",
      entityId: documentId,
      metadata: { customerId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
