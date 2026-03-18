import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/modules/auth";
import { prisma } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validations/settings";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
      select: {
        id: true,
        name: true,
        email: true,
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

