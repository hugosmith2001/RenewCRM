/**
 * Central API error handling – Phase 8.
 * Maps known errors to consistent JSON responses and status codes.
 */
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof Error) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  logger.error("Unhandled API error", { err });
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd && err instanceof Error) {
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

