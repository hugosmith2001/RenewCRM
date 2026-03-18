import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/me/profile/route";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

const { requireAuth } = await import("@/modules/auth");
const { prisma } = await import("@/lib/db");

const mockRequireAuth = vi.mocked(requireAuth);
const mockPrismaUserUpdate = vi.mocked(prisma.user.update);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Phase 1: PATCH /api/me/profile.
 * Covers:
 * - 401 when requireAuth throws Unauthorized.
 * - Successful update of only the current user's name.
 * - Response shape excludes passwordHash and internal fields.
 * - Validation failures for empty/whitespace/overly long name.
 * - Ignores client-provided id/tenantId and still uses session user.id.
 */
describe("PATCH /api/me/profile", () => {
  it("returns 401 when requireAuth throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(makeRequest({ name: "New Name" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("updates only the authenticated user's name when payload is valid", async () => {
    const sessionUser = {
      id: "user-1",
      email: "user@example.com",
      name: "Old Name",
      tenantId: "tenant-1",
      role: "ADMIN" as const,
    };
    mockRequireAuth.mockResolvedValue(sessionUser);
    mockPrismaUserUpdate.mockResolvedValue({
      id: "user-1",
      name: "New Name",
      email: "user@example.com",
    });

    const res = await PATCH(
      makeRequest({
        name: "New Name",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "user-1",
      name: "New Name",
      email: "user@example.com",
    });
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "New Name" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  });

  it("does not expose passwordHash or other internal fields in the response", async () => {
    const sessionUser = {
      id: "user-1",
      email: "user@example.com",
      name: "Old Name",
      tenantId: "tenant-1",
      role: "STAFF" as const,
    };
    mockRequireAuth.mockResolvedValue(sessionUser);
    // prisma.select prevents passwordHash from ever being returned,
    // but we still assert that the JSON body only contains minimal fields.
    mockPrismaUserUpdate.mockResolvedValue({
      id: "user-1",
      name: "New Name",
      email: "user@example.com",
    });

    const res = await PATCH(makeRequest({ name: "New Name" }));

    const body = await res.json();
    expect(body.id).toBe("user-1");
    expect(body.name).toBe("New Name");
    expect(body.email).toBe("user@example.com");
    // Ensure no obvious sensitive field sneaks through.
    expect(body.passwordHash).toBeUndefined();
    expect(Object.keys(body)).toEqual(["id", "name", "email"]);
  });

  it("returns 400 when name is empty, whitespace-only, or too long", async () => {
    const sessionUser = {
      id: "user-1",
      email: "user@example.com",
      name: "Old Name",
      tenantId: "tenant-1",
      role: "BROKER" as const,
    };
    mockRequireAuth.mockResolvedValue(sessionUser);

    const cases = ["", "   ", "x".repeat(101)];

    for (const badName of cases) {
      const res = await PATCH(makeRequest({ name: badName }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    }

    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("ignores client-provided id and tenantId and still updates only the authenticated user", async () => {
    const sessionUser = {
      id: "user-1",
      email: "user@example.com",
      name: "Old Name",
      tenantId: "tenant-1",
      role: "ADMIN" as const,
    };
    mockRequireAuth.mockResolvedValue(sessionUser);
    mockPrismaUserUpdate.mockResolvedValue({
      id: "user-1",
      name: "New Name",
      email: "user@example.com",
    });

    const res = await PATCH(
      makeRequest({
        name: "New Name",
        // These should be ignored by the implementation
        id: "other-user",
        tenantId: "other-tenant",
        role: "BROKER",
      })
    );

    expect(res.status).toBe(200);
    await res.json();

    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "New Name" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  });
});

