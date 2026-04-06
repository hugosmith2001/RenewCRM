import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { createDsarRequest, listDsarRequests } from "@/modules/dsar";
import { createDsarRequestSchema, listDsarRequestsQuerySchema } from "@/lib/validations/dsar";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

/**
 * Admin DSAR tooling – Phase 3A.
 * POST /api/admin/dsar: create a DSAR request
 * GET  /api/admin/dsar: list DSAR requests (tenant-scoped)
 */

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const body = await request.json();
    const parsed = createDsarRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const created = await createDsarRequest(user, parsed.data);
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "SubjectNotFound") {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { searchParams } = new URL(request.url);
    const parsed = listDsarRequestsQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      requestType: searchParams.get("requestType") ?? undefined,
      subjectType: searchParams.get("subjectType") ?? undefined,
      subjectRefId: searchParams.get("subjectRefId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { requests, total } = await listDsarRequests(user, parsed.data);
    return NextResponse.json({ requests, total });
  } catch (err) {
    return handleApiError(err);
  }
}

