import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth";
import { listCustomers, createCustomer } from "@/modules/customers";
import { logAuditEvent } from "@/modules/audit";
import { createCustomerSchema, listCustomersQuerySchema } from "@/lib/validations/customers";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parsed = listCustomersQuerySchema.safeParse({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
    }
    const { customers, total } = await listCustomers(user.tenantId, parsed.data);
    return NextResponse.json({ customers, total });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const customer = await createCustomer(user.tenantId, parsed.data);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      metadata: {},
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
