import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/tenant/route";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { requireAuth, requireRole } = await import("@/modules/auth");
const { prisma } = await import("@/lib/db");

const mockRequireAuth = vi.mocked(requireAuth);
const mockRequireRole = vi.mocked(requireRole);
const mockPrismaTenantFindUnique = vi.mocked(prisma.tenant.findUnique);
const mockPrismaTenantUpdate = vi.mocked(prisma.tenant.update);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(method: string, body?: unknown, url?: string) {
  return new NextRequest(url ?? "http://localhost/api/tenant", {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * Phase 4: /api/tenant (Brokerage).
 *
 * GET:
 *  - 401 for unauthenticated requests
 *  - returns only current tenant { name, slug }
 *  - derives tenant from session user.tenantId, not client input
 *  - response shape is minimal
 *
 * PATCH:
 *  - 401 for unauthenticated requests
 *  - 403 for non-ADMIN (Forbidden)
 *  - ADMIN updates only current tenant's name
 *  - derives tenant scope from session user.tenantId
 *  - validation rejects empty/whitespace/overly long names
 *  - slug is read-only; payload slug is ignored
 *  - client-supplied tenantId/id are ignored
 *  - response is minimal ({ name, slug })
 */
describe("/api/tenant", () => {
  describe("GET /api/tenant", () => {
    it("returns 401 when requireAuth throws Unauthorized", async () => {
      mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

      const res = await GET();

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
      expect(mockPrismaTenantFindUnique).not.toHaveBeenCalled();
    });

    it("returns current tenant's basic info (name, slug) for authenticated user", async () => {
      mockRequireAuth.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantId: "tenant-1",
        role: "STAFF",
      });
      mockPrismaTenantFindUnique.mockResolvedValue({
        name: "Acme Brokerage",
        slug: "acme-brokerage",
      });

      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        name: "Acme Brokerage",
        slug: "acme-brokerage",
      });
      expect(mockPrismaTenantFindUnique).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        select: { name: true, slug: true },
      });
    });

    it("derives tenant from session user.tenantId, not client input", async () => {
      mockRequireAuth.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantId: "tenant-1",
        role: "STAFF",
      });
      mockPrismaTenantFindUnique.mockResolvedValue({
        name: "Acme Brokerage",
        slug: "acme-brokerage",
      });

      const req = makeRequest(
        "GET",
        undefined,
        "http://localhost/api/tenant?tenantId=other-tenant&id=other-id"
      );

      // GET handler ignores the request object entirely; we only assert that
      // it still scopes to tenant-1 from the session.
      const res = await GET();

      expect(res.status).toBe(200);
      await res.json();
      expect(mockPrismaTenantFindUnique).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        select: { name: true, slug: true },
      });
      // ensure the constructed request is unused (no tenantId/id from client).
      expect(req.nextUrl.searchParams.get("tenantId")).toBe("other-tenant");
    });

    it("returns 404 when tenant is not found", async () => {
      mockRequireAuth.mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        tenantId: "tenant-1",
        role: "STAFF",
      });
      mockPrismaTenantFindUnique.mockResolvedValue(null);

      const res = await GET();

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Tenant not found" });
    });
  });

  describe("PATCH /api/tenant", () => {
    it("returns 401 when requireRole throws Unauthorized", async () => {
      mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

      const res = await PATCH(makeRequest("PATCH", { name: "New Name" }));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
      expect(mockPrismaTenantUpdate).not.toHaveBeenCalled();
    });

    it("returns 403 when requireRole throws Forbidden (non-ADMIN user)", async () => {
      mockRequireRole.mockRejectedValue(new Error("Forbidden"));

      const res = await PATCH(makeRequest("PATCH", { name: "New Name" }));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toEqual({ error: "Forbidden" });
      expect(mockPrismaTenantUpdate).not.toHaveBeenCalled();
    });

    it("updates only current tenant's name for ADMIN with valid payload", async () => {
      const sessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
      };
      mockRequireRole.mockResolvedValue(sessionUser);
      mockPrismaTenantUpdate.mockResolvedValue({
        name: "New Brokerage Name",
        slug: "acme-brokerage",
      });

      const res = await PATCH(
        makeRequest("PATCH", {
          name: "New Brokerage Name",
          // extra client fields should be ignored
          id: "other-tenant-id",
          tenantId: "other-tenant",
          slug: "new-slug",
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        name: "New Brokerage Name",
        slug: "acme-brokerage",
      });

      expect(mockPrismaTenantUpdate).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: {
          name: "New Brokerage Name",
        },
        select: {
          name: true,
          slug: true,
        },
      });
    });

    it("rejects empty, whitespace-only, and overly long names with 400", async () => {
      const sessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
      };
      mockRequireRole.mockResolvedValue(sessionUser);

      const cases = ["", "   ", "x".repeat(151)];

      for (const badName of cases) {
        const res = await PATCH(makeRequest("PATCH", { name: badName }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe("Validation failed");
        expect(body.details).toBeDefined();
      }

      expect(mockPrismaTenantUpdate).not.toHaveBeenCalled();
    });

    it("treats slug as read-only even if provided in payload", async () => {
      const sessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
      };
      mockRequireRole.mockResolvedValue(sessionUser);
      mockPrismaTenantUpdate.mockResolvedValue({
        name: "New Brokerage Name",
        slug: "existing-slug",
      });

      const res = await PATCH(
        makeRequest("PATCH", {
          name: "New Brokerage Name",
          slug: "attempted-change",
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        name: "New Brokerage Name",
        slug: "existing-slug",
      });

      // ensure slug from payload is not used in the update
      expect(mockPrismaTenantUpdate).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: {
          name: "New Brokerage Name",
        },
        select: {
          name: true,
          slug: true,
        },
      });
    });

    it("does not allow cross-tenant writes even with client-supplied tenantId or id", async () => {
      const sessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
      };
      mockRequireRole.mockResolvedValue(sessionUser);
      mockPrismaTenantUpdate.mockResolvedValue({
        name: "New Brokerage Name",
        slug: "acme-brokerage",
      });

      const res = await PATCH(
        makeRequest("PATCH", {
          name: "New Brokerage Name",
          id: "other-tenant-id",
          tenantId: "other-tenant",
        })
      );

      expect(res.status).toBe(200);
      await res.json();
      expect(mockPrismaTenantUpdate).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: {
          name: "New Brokerage Name",
        },
        select: {
          name: true,
          slug: true,
        },
      });
    });

    it("returns only minimal fields (name, slug) in the response", async () => {
      const sessionUser = {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
      };
      mockRequireRole.mockResolvedValue(sessionUser);
      mockPrismaTenantUpdate.mockResolvedValue({
        name: "New Brokerage Name",
        slug: "acme-brokerage",
      });

      const res = await PATCH(
        makeRequest("PATCH", {
          name: "New Brokerage Name",
        })
      );

      const body = await res.json();
      expect(Object.keys(body)).toEqual(["name", "slug"]);
    });
  });
});

