import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import {
  getInsuredObjectById,
  updateInsuredObject,
  deleteInsuredObject,
} from "@/modules/insured-objects";
import { logAuditEvent } from "@/modules/audit";
import { updateInsuredObjectSchema } from "@/lib/validations/insured-objects";
import { handleApiError } from "@/lib/api-error";
import { revalidateCustomerDetailCaches } from "@/lib/revalidate";

type Params = { params: Promise<{ id: string; objectId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, objectId } = await params;
    const obj = await getInsuredObjectById(user.tenantId, objectId);
    if (!obj) {
      return NextResponse.json(
        { error: "Insured object not found" },
        { status: 404 }
      );
    }
    if (obj.customerId !== customerId) {
      return NextResponse.json(
        { error: "Insured object does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, obj.tenantId);
    const body = await request.json();
    const parsed = updateInsuredObjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await updateInsuredObject(user.tenantId, objectId, parsed.data);
    if (updated) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "InsuredObject",
        entityId: objectId,
        metadata: { customerId },
      });
    }
    revalidateCustomerDetailCaches(user.tenantId, customerId);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, objectId } = await params;
    const obj = await getInsuredObjectById(user.tenantId, objectId);
    if (!obj) {
      return NextResponse.json(
        { error: "Insured object not found" },
        { status: 404 }
      );
    }
    if (obj.customerId !== customerId) {
      return NextResponse.json(
        { error: "Insured object does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, obj.tenantId);
    await deleteInsuredObject(user.tenantId, objectId);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "InsuredObject",
      entityId: objectId,
      metadata: { customerId },
    });
    revalidateCustomerDetailCaches(user.tenantId, customerId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
