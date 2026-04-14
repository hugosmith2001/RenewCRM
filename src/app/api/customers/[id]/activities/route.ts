import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import { listActivitiesByCustomerId, createActivity } from "@/modules/activities";
import { logAuditEvent } from "@/modules/audit";
import { createActivitySchema } from "@/lib/validations/activities";
import { handleApiError } from "@/lib/api-error";
import { revalidateCustomerDetailCaches } from "@/lib/revalidate";

type Params = { params: Promise<{ id: string }> };

export const preferredRegion = "arn1";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, customer.tenantId);
    const activities = await listActivitiesByCustomerId(user.tenantId, customerId);
    return NextResponse.json(activities, { headers: { "Cache-Control": "no-store" } });
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
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    assertTenantAccess(user, customer.tenantId);
    const body = await request.json();
    const parsed = createActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const activity = await createActivity(user.tenantId, customerId, parsed.data, user.id);
    if (!activity) {
      return NextResponse.json({ error: "Failed to create activity" }, { status: 400 });
    }
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "Activity",
      entityId: activity.id,
      metadata: { customerId, type: activity.type },
    });
    revalidateCustomerDetailCaches(user.tenantId, customerId);
    return NextResponse.json(activity, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
