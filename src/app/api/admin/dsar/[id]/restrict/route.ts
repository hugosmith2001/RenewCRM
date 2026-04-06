import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { executeDsarRestriction } from "@/modules/dsar";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin DSAR restriction execution – Phase 3D.
 * POST /api/admin/dsar/:id/restrict
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body && typeof body === "object" && "reason" in body ? String((body as any).reason ?? "") : "";

    try {
      const out = await executeDsarRestriction(user, id, { reason: reason.trim() || null });
      return NextResponse.json(out, { status: 201 });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "DsarRequestNotFound") return NextResponse.json({ error: "DSAR request not found" }, { status: 404 });
        if (err.message === "DsarRequestNotApproved") return NextResponse.json({ error: "DSAR request must be APPROVED to restrict" }, { status: 409 });
        if (err.message === "DsarRequestNotRestrict") return NextResponse.json({ error: "DSAR request is not a RESTRICT request" }, { status: 409 });
        if (err.message === "SubjectNotFound") return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

