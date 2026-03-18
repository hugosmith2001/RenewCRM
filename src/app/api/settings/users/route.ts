import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireRole } from "@/modules/auth";
import { handleApiError } from "@/lib/api-error";
import { createUserSchema } from "@/lib/validations/settings";
import { Role } from "@prisma/client";

function generateTempPassword(length = 12): string {
  const raw = randomBytes(length * 2)
    .toString("base64")
    .replace(/[+/=]/g, "A");
  return raw.slice(0, length);
}

export async function GET() {
  try {
    const user = await requireRole([Role.ADMIN]);

    const users = await prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireRole([Role.ADMIN]);
    const body = await request.json();

    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role, name } = parsed.data;

    const tempPassword = generateTempPassword();
    const passwordHash = await hash(tempPassword, 10);

    const created = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        role,
        tenantId: currentUser.tenantId,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      user: created,
      tempPassword,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

