import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireRole } from "@/modules/auth";
import { Role } from "@prisma/client";
import { updateTenantSchema } from "@/lib/validations/settings";

export async function GET() {
  try {
    const user = await requireAuth();

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        slug: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tenant);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "Unauthorized" || err.message === "Forbidden")
    ) {
      return NextResponse.json(
        { error: err.message },
        { status: err.message === "Unauthorized" ? 401 : 403 }
      );
    }

    throw err;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const body = await request.json();
    const parsed = updateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: parsed.data.name,
      },
      select: {
        name: true,
        slug: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "Unauthorized" || err.message === "Forbidden")
    ) {
      return NextResponse.json(
        { error: err.message },
        { status: err.message === "Unauthorized" ? 401 : 403 }
      );
    }

    throw err;
  }
}

