import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/modules/auth";
import { changePasswordSchema } from "@/lib/validations/settings";
import { handleApiError } from "@/lib/api-error";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    // Additional server-side rate limit (middleware is best-effort).
    const ip = getClientIp(request);
    const rl = rateLimit({
      key: `api:me:password:${sessionUser.id}:${ip}`,
      limit: 5,
      windowMs: 10 * 60_000,
    });
    if (!rl.ok) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    const body = await request.json();

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isCurrentValid = await compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const newHash = await hash(newPassword, 10);

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { passwordHash: newHash, sessionVersion: { increment: 1 } },
    });

    // Best-effort immediate local sign-out by clearing possible session cookies.
    // Long-term invalidation is enforced by sessionVersion in the JWT callback.
    const res = NextResponse.json({ success: true });
    res.cookies.set("authjs.session-token", "", { path: "/", maxAge: 0 });
    res.cookies.set("__Secure-authjs.session-token", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

