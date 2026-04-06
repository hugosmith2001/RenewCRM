import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { getActivityById, updateActivity, deleteActivity } from "@/modules/activities";
import { logAuditEvent } from "@/modules/audit";
import { updateActivitySchema } from "@/lib/validations/activities";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string; activityId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const { id: customerId, activityId } = await params;
    const activity = await getActivityById(user.tenantId, activityId);
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    if (activity.customerId !== customerId) {
      return NextResponse.json({ error: "Activity does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, activity.tenantId);
    return NextResponse.json(activity);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId, activityId } = await params;
    const activity = await getActivityById(user.tenantId, activityId);
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    if (activity.customerId !== customerId) {
      return NextResponse.json({ error: "Activity does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, activity.tenantId);
    const body = await request.json();
    const parsed = updateActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await updateActivity(user.tenantId, activityId, parsed.data);
    if (updated) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "Activity",
        entityId: activityId,
        metadata: { customerId, type: updated.type },
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
    const { id: customerId, activityId } = await params;
    const activity = await getActivityById(user.tenantId, activityId);
    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    if (activity.customerId !== customerId) {
      return NextResponse.json({ error: "Activity does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, activity.tenantId);
    await deleteActivity(user.tenantId, activityId);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "Activity",
      entityId: activityId,
      metadata: { type: activity.type },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
