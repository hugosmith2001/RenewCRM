import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { generateDsarExportForRequest, getDsarExportByRequestId } from "@/modules/dsar";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin DSAR export – Phase 3B.
 * POST /api/admin/dsar/:id/export  - generate export (requires APPROVED DSAR request)
 * GET  /api/admin/dsar/:id/export  - get export status/result (tenant-scoped)
 */

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { id } = await params;

    try {
      const exp = await generateDsarExportForRequest(user, id, { includeFiles: false });
      return NextResponse.json(exp, { status: 201 });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "DsarRequestNotFound") return NextResponse.json({ error: "DSAR request not found" }, { status: 404 });
        if (err.message === "DsarRequestNotExport") return NextResponse.json({ error: "DSAR request is not an export request" }, { status: 409 });
        if (err.message === "DsarRequestNotApproved") return NextResponse.json({ error: "DSAR request must be APPROVED to export" }, { status: 409 });
        if (err.message === "ExportFilesNotSupported") return NextResponse.json({ error: "File bundling is not supported yet" }, { status: 422 });
        if (err.message === "UserExportNotImplemented") return NextResponse.json({ error: "User export not implemented yet" }, { status: 501 });
        if (err.message === "SubjectNotFound") return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { id } = await params;
    const exp = await getDsarExportByRequestId(user, id);
    if (!exp) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }
    return NextResponse.json(exp);
  } catch (err) {
    return handleApiError(err);
  }
}

