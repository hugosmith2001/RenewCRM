import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { handleApiError } from "@/lib/api-error";
import { updateUserSchema } from "@/lib/validations/settings";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await requireRole([Role.ADMIN]);
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    assertTenantAccess(currentUser, existing.tenantId);

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    const isCurrentlyActiveAdmin =
      existing.role === Role.ADMIN && existing.isActive;

    if (isCurrentlyActiveAdmin) {
      const willDemoteAdmin =
        updates.role !== undefined && updates.role !== Role.ADMIN;
      const willDeactivateAdmin =
        updates.isActive !== undefined &&
        updates.isActive === false &&
        existing.isActive === true;

      if (willDemoteAdmin || willDeactivateAdmin) {
        const activeAdminCount = await prisma.user.count({
          where: {
            tenantId: currentUser.tenantId,
            role: Role.ADMIN,
            isActive: true,
          },
        });

        if (activeAdminCount === 1) {
          return NextResponse.json(
            { error: "Cannot remove the last active admin in the tenant" },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: updates.name ?? existing.name,
        role: updates.role ?? existing.role,
        isActive:
          updates.isActive !== undefined ? updates.isActive : existing.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

