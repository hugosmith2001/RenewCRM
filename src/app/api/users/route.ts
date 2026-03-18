import { NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

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
    if (err instanceof Error && (err.message === "Unauthorized" || err.message === "Forbidden")) {
      return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
    }
    throw err;
  }
}
