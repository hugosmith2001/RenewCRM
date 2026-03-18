/**
 * Central API error handling – Phase 8.
 * Maps known errors to consistent JSON responses and status codes.
 */
import { NextResponse } from "next/server";

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof Error) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  throw err;
}

