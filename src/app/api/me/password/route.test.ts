import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/me/password/route";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

const { requireAuth } = await import("@/modules/auth");
const { prisma } = await import("@/lib/db");
const { compare, hash } = await import("bcryptjs");

const mockRequireAuth = vi.mocked(requireAuth);
const mockPrismaUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockPrismaUserUpdate = vi.mocked(prisma.user.update);
const mockCompare = vi.mocked(compare);
const mockHash = vi.mocked(hash);

beforeEach(() => {
  vi.clearAllMocks();
  // Ensure rate limiting state doesn't leak between tests.
  (globalThis as unknown as Record<string, unknown>).__safekeep_rate_limit_buckets__ = new Map();
});

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/me/password", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Phase 2: POST /api/me/password.
 * Covers: 401 via requireAuth, validation errors, invalid current password,
 * and successful password change that updates only passwordHash.
 */
describe("POST /api/me/password", () => {
  it("returns 401 when requireAuth throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      makeRequest({ currentPassword: "old", newPassword: "newpassword", confirmNewPassword: "newpassword" })
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when validation fails", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-1",
    });

    const res = await POST(
      makeRequest({ currentPassword: "", newPassword: "short", confirmNewPassword: "mismatch" })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 429 when rate limit exceeded for same user and IP", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-1",
    });

    // The endpoint rate-limits before it parses/validates JSON, so use intentionally bad bodies.
    const headers = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ currentPassword: "", newPassword: "", confirmNewPassword: "" }, headers));
      expect(res.status).not.toBe(429);
    }

    const blocked = await POST(makeRequest({ currentPassword: "", newPassword: "", confirmNewPassword: "" }, headers));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("Too Many Requests");

    expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when current password is invalid", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-1",
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed-old",
    });
    mockCompare.mockResolvedValue(false as never);

    const res = await POST(
      makeRequest({ currentPassword: "wrong", newPassword: "newpassword", confirmNewPassword: "newpassword" })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("updates passwordHash and returns success when valid", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-1",
    });
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hashed-old",
    });
    mockCompare.mockResolvedValue(true as never);
    mockHash.mockResolvedValue("hashed-new" as never);
    mockPrismaUserUpdate.mockResolvedValue({
      id: "user-1",
    });

    const res = await POST(
      makeRequest({ currentPassword: "oldpassword", newPassword: "newpassword", confirmNewPassword: "newpassword" })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed-new", sessionVersion: { increment: 1 } },
    });
  });
});

