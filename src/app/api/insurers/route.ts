import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth";
import { listInsurers, createInsurer } from "@/modules/policies";
import { logAuditEvent } from "@/modules/audit";
import { createInsurerSchema } from "@/lib/validations/insurers";
import { handleApiError } from "@/lib/api-error";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();
    const insurers = await listInsurers(user.tenantId);
    return NextResponse.json(insurers);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = createInsurerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const insurer = await createInsurer(user.tenantId, parsed.data);
    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "CREATE",
      entityType: "Insurer",
      entityId: insurer.id,
      metadata: {},
    });
    return NextResponse.json(insurer, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
