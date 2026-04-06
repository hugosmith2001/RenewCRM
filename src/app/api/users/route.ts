import { NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { handleApiError } from "@/lib/api-error";

/**
 * List users in the current tenant (for dropdowns, e.g. customer owner).
 */
export async function GET() {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const users = await prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    return handleApiError(err);
  }
}
