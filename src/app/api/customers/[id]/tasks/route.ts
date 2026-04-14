import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import { listTasksByCustomerId, createTask } from "@/modules/tasks";
import { logAuditEvent } from "@/modules/audit";
import { createTaskSchema } from "@/lib/validations/tasks";
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
    const tasks = await listTasksByCustomerId(user.tenantId, customerId);
    return NextResponse.json(tasks, { headers: { "Cache-Control": "no-store" } });
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
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const task = await createTask(user.tenantId, customerId, parsed.data);
    if (!task) {
      return NextResponse.json({ error: "Failed to create task" }, { status: 400 });
    }
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "Task",
      entityId: task.id,
      metadata: { customerId, status: task.status },
    });
    revalidateCustomerDetailCaches(user.tenantId, customerId);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
