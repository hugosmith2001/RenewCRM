import { NextResponse } from "next/server";

/**
 * Health check endpoint for foundation.
 * Used by deployment/monitoring; no business logic.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", phase: 0 });
}
