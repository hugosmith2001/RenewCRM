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
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/me/password", {
    method: "POST",
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
      role: "ADMIN",
    });

    const res = await POST(
      makeRequest({ currentPassword: "", newPassword: "short", confirmNewPassword: "mismatch" })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 400 when current password is invalid", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-1",
      role: "ADMIN",
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
    expect(body.error).toBe("Invalid current password");
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("updates passwordHash and returns success when valid", async () => {
    mockRequireAuth.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      tenantId: "tenant-1",
      role: "ADMIN",
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
      data: { passwordHash: "hashed-new" },
    });
  });
});

