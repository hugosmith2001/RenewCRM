import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth";
import { listAuditEvents } from "@/modules/audit";
import { listAuditQuerySchema } from "@/lib/validations/audit";
import { handleApiError } from "@/lib/api-error";

/**
 * GET /api/audit – List audit events for the current tenant.
 * Query: entityType, entityId, action, page, limit.
 * Admin and Broker can view audit log.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const parsed = listAuditQuerySchema.safeParse({
      entityType: searchParams.get("entityType") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { events, total } = await listAuditEvents(user.tenantId, parsed.data);
    return NextResponse.json({ events, total });
  } catch (err) {
    return handleApiError(err);
  }
}
