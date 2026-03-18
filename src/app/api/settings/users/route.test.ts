import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/settings/users/route";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { requireRole } = await import("@/modules/auth");
const { prisma } = await import("@/lib/db");

const mockRequireRole = vi.mocked(requireRole);
const mockPrismaUserFindMany = vi.mocked(prisma.user.findMany);
const mockPrismaUserCreate = vi.mocked(prisma.user.create);

const adminUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  tenantId: "tenant-1",
  role: Role.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/settings/users", {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Phase 5A: /api/settings/users (Team list/create).
 *
 * GET:
 *  - 401/403 when requireRole throws Unauthorized/Forbidden
 *  - lists users scoped to current tenant from session user.tenantId
 *  - returns minimal fields (id, name, email, role, isActive)
 *
 * POST:
 *  - 401/403 when requireRole throws
 *  - validates email, role, optional name (400 on invalid)
 *  - derives tenantId from session user.tenantId, ignores client tenantId
 *  - never returns passwordHash
 *  - returns created user plus one-time tempPassword
 */
describe("/api/settings/users", () => {
  describe("GET /api/settings/users", () => {
    it("returns 401 when requireRole throws Unauthorized", async () => {
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const res = await GET();

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(mockPrismaUserFindMany).not.toHaveBeenCalled();
    });

    it("returns 403 when requireRole throws Forbidden", async () => {
      mockRequireRole.mockRejectedValue(new Error("Forbidden"));

      const res = await GET();

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
      expect(mockPrismaUserFindMany).not.toHaveBeenCalled();
    });

    it("lists users in the current tenant with minimal fields", async () => {
      mockRequireRole.mockResolvedValue(adminUser);
      mockPrismaUserFindMany.mockResolvedValue([
        {
          id: "user-1",
          name: "User One",
          email: "user1@example.com",
          role: Role.STAFF,
          isActive: true,
        },
      ]);

      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: "user-1",
        name: "User One",
        email: "user1@example.com",
        role: Role.STAFF,
        isActive: true,
      });
      expect(mockPrismaUserFindMany).toHaveBeenCalledWith({
        where: { tenantId: "tenant-1" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("POST /api/settings/users", () => {
    it("returns 401 when requireRole throws Unauthorized", async () => {
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const res = await POST(
        makeRequest("POST", {
          email: "new.user@example.com",
          role: "STAFF",
        })
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(mockPrismaUserCreate).not.toHaveBeenCalled();
    });

    it("returns 403 when requireRole throws Forbidden", async () => {
      mockRequireRole.mockRejectedValue(new Error("Forbidden"));

      const res = await POST(
        makeRequest("POST", {
          email: "new.user@example.com",
          role: "STAFF",
        })
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
      expect(mockPrismaUserCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when validation fails", async () => {
      mockRequireRole.mockResolvedValue(adminUser);

      const res = await POST(
        makeRequest("POST", {
          email: "not-an-email",
          role: "STAFF",
        })
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
      expect(mockPrismaUserCreate).not.toHaveBeenCalled();
    });

    it("creates a user in the current tenant and returns user plus tempPassword", async () => {
      mockRequireRole.mockResolvedValue(adminUser);
      mockPrismaUserCreate.mockResolvedValue({
        id: "user-new",
        name: "New User",
        email: "new.user@example.com",
        role: Role.STAFF,
        isActive: true,
      });

      const res = await POST(
        makeRequest("POST", {
          email: "new.user@example.com",
          role: "STAFF",
          name: "New User",
          // extra tenantId should be ignored by validation
          tenantId: "other-tenant",
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.user).toEqual({
        id: "user-new",
        name: "New User",
        email: "new.user@example.com",
        role: "STAFF",
        isActive: true,
      });
      expect(typeof body.tempPassword).toBe("string");
      expect(body.tempPassword.length).toBeGreaterThanOrEqual(8);

      expect(mockPrismaUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "new.user@example.com",
          name: "New User",
          role: "STAFF",
          tenantId: "tenant-1",
          isActive: true,
        }),
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });
    });
  });
});

