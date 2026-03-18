import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

/**
 * Phase 0: Health API route.
 * Covers: GET returns 200 and expected body. Does not cover deployment or middleware.
 */
describe("GET /api/health", () => {
  it("returns 200 with status ok and phase 0", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", phase: 0 });
  });

  it("returns JSON content-type", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });
});
