import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { getDsarRequestById, transitionDsarStatus } from "@/modules/dsar";
import { updateDsarStatusSchema } from "@/lib/validations/dsar";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin DSAR tooling – Phase 3A.
 * GET   /api/admin/dsar/:id  - request detail (tenant-scoped)
 * PATCH /api/admin/dsar/:id  - transition request status
 */

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { id } = await params;
    const req = await getDsarRequestById(user, id);
    if (!req) {
      return NextResponse.json({ error: "DSAR request not found" }, { status: 404 });
    }
    return NextResponse.json(req);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateDsarStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const updated = await transitionDsarStatus(user, id, parsed.data);
      if (!updated) {
        return NextResponse.json({ error: "DSAR request not found" }, { status: 404 });
      }
      return NextResponse.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message === "InvalidStatusTransition") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

