import { describe, it, expect } from "vitest";
import { handleApiError } from "@/lib/api-error";

/**
 * Phase 8: Central API error handling.
 * Covers: 401 for Unauthorized, 403 for Forbidden, 500 for other errors.
 * Does not cover: NextResponse internals, or routes that use handleApiError.
 */
describe("handleApiError", () => {
  it("returns 401 response when error message is Unauthorized", async () => {
    const err = new Error("Unauthorized");
    const res = handleApiError(err);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 response when error message is Forbidden", async () => {
    const err = new Error("Forbidden");
    const res = handleApiError(err);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("returns 500 when error message is something else", async () => {
    const err = new Error("Something went wrong");
    const res = handleApiError(err);
    expect(res.status).toBe(500);
    const body = await res.json();
    // In non-production envs we include a safe `details` string for faster debugging.
    expect(body).toEqual({
      error: "Internal Server Error",
      details: "Something went wrong",
    });
  });

  it("returns 500 when value is not an Error instance", async () => {
    for (const err of ["string error", null, 404] as const) {
      const res = handleApiError(err);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Internal Server Error" });
    }
  });

  it("returns 500 when err is undefined (edge case)", async () => {
    const res = handleApiError(undefined);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal Server Error" });
  });
});
