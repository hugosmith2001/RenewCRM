import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { getDsarExportByRequestId } from "@/modules/dsar";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin DSAR export download – Phase 3B.
 * GET /api/admin/dsar/:id/export/download?format=json|csv
 *
 * - json: downloads canonical JSON payload
 * - csv: downloads a single CSV file (requires `file` query param)
 */

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const { id } = await params;
    const exp = await getDsarExportByRequestId(user, id);
    if (!exp) return NextResponse.json({ error: "Export not found" }, { status: 404 });
    if (exp.status !== "COMPLETED" || !exp.exportJson) {
      return NextResponse.json({ error: "Export not ready" }, { status: 409 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "json").toLowerCase();

    if (format === "json") {
      const filename = `dsar_export_${exp.dsarRequestId}_v${exp.formatVersion}.json`;
      return new NextResponse(JSON.stringify(exp.exportJson, null, 2), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "csv") {
      const file = searchParams.get("file");
      const csv = exp.exportCsv ?? null;
      if (!file) return NextResponse.json({ error: "Missing file query param" }, { status: 400 });
      if (!csv || typeof csv !== "object") return NextResponse.json({ error: "No CSV summaries available" }, { status: 404 });
      const content = (csv as Record<string, string>)[file];
      if (!content) return NextResponse.json({ error: "CSV file not found" }, { status: 404 });
      const safeName = file.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "export.csv";
      return new NextResponse(content, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${safeName}"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}

