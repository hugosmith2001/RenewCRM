import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getTaskById, updateTask, deleteTask } from "@/modules/tasks";
import { logAuditEvent } from "@/modules/audit";
import { updateTaskSchema } from "@/lib/validations/tasks";
import { handleApiError } from "@/lib/api-error";
import { revalidateCustomerDetailCaches } from "@/lib/revalidate";

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, taskId } = await params;
    const task = await getTaskById(user.tenantId, taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.customerId !== customerId) {
      return NextResponse.json({ error: "Task does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, task.tenantId);
    return NextResponse.json(task);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, taskId } = await params;
    const task = await getTaskById(user.tenantId, taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.customerId !== customerId) {
      return NextResponse.json({ error: "Task does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, task.tenantId);
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const updated = await updateTask(user.tenantId, taskId, parsed.data);
    if (updated) {
      await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: "UPDATE",
        entityType: "Task",
        entityId: taskId,
        metadata: { customerId, status: updated.status },
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
    const { id: customerId, taskId } = await params;
    const task = await getTaskById(user.tenantId, taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.customerId !== customerId) {
      return NextResponse.json({ error: "Task does not belong to this customer" }, { status: 400 });
    }
    assertTenantAccess(user, task.tenantId);
    await deleteTask(user.tenantId, taskId);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "DELETE",
      entityType: "Task",
      entityId: taskId,
      metadata: { customerId },
    });
    revalidateCustomerDetailCaches(user.tenantId, customerId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
