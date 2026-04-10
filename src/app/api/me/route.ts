import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";

/**
 * Example protected API route.
 * Returns current user from session; 401 if not authenticated.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
  });
}
