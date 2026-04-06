import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { listInsurers, createInsurer } from "@/modules/policies";
import { logAuditEvent } from "@/modules/audit";
import { createInsurerSchema } from "@/lib/validations/insurers";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const insurers = await listInsurers(user.tenantId);
    return NextResponse.json(insurers);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
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
