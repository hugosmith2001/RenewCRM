import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/me/route";

vi.mock("@/modules/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { getCurrentUser } = await import("@/modules/auth");
const mockGetCurrentUser = vi.mocked(getCurrentUser);

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 1: Protected /api/me route.
 * Covers: 401 when unauthenticated, 200 and user body when authenticated.
 * Does not cover real session or middleware.
 */
describe("GET /api/me", () => {
  it("returns 401 when getCurrentUser returns null", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 and user payload when authenticated", async () => {
    const user = {
      id: "user-1",
      email: "admin@demo.local",
      name: "Demo Admin",
      tenantId: "tenant-1",
    };
    mockGetCurrentUser.mockResolvedValue(user);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    });
  });

  it("returns user with null name when name is null", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "x@x.com",
      name: null,
      tenantId: "t1",
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBeNull();
  });
});
