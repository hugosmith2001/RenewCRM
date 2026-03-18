import { describe, it, expect, vi } from "vitest";
import { handleApiError } from "@/lib/api-error";

/**
 * Phase 8: Central API error handling.
 * Covers: 401 for Unauthorized, 403 for Forbidden, re-throw for other errors.
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

  it("re-throws when error message is something else", () => {
    const err = new Error("Something went wrong");

    expect(() => handleApiError(err)).toThrow("Something went wrong");
  });

  it("re-throws when value is not an Error instance", () => {
    expect(() => handleApiError("string error")).toThrow("string error");
    expect(() => handleApiError(null)).toThrow();
    expect(() => handleApiError(404)).toThrow();
  });

  it("re-throws when err is undefined (edge case)", () => {
    expect(() => handleApiError(undefined)).toThrow();
  });
});
