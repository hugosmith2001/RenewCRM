import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/audit/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/modules/audit", () => ({
  listAuditEvents: vi.fn(),
}));

const { requireRole } = await import("@/modules/auth");
const { listAuditEvents } = await import("@/modules/audit");
const mockRequireRole = vi.mocked(requireRole);
const mockListAuditEvents = vi.mocked(listAuditEvents);

const authUser = {
  id: "user-1",
  email: "admin@tenant.local",
  name: "Admin",
  tenantId: "tenant-1",
  role: Role.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 8: GET /api/audit.
 * Covers: 401/403 when requireRole fails, 400 on invalid query params,
 * 200 with events/total when authenticated (ADMIN/BROKER), tenantId passed to service.
 * Does not cover: STAFF forbidden (requireRole rejects), real DB, or validation schema edge cases.
 */
describe("GET /api/audit", () => {
  function request(url = "http://localhost/api/audit") {
    return new NextRequest(url);
  }

  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(request());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 403 when requireRole throws Forbidden", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden"));

    const res = await GET(request());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 400 when query validation fails", async () => {
    mockRequireRole.mockResolvedValue(authUser);

    const res = await GET(request("http://localhost/api/audit?entityType=Invalid"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid query");
    expect(body.details).toBeDefined();
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 400 when limit exceeds 100", async () => {
    mockRequireRole.mockResolvedValue(authUser);

    const res = await GET(request("http://localhost/api/audit?limit=101"));

    expect(res.status).toBe(400);
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 200 and events/total when authenticated with valid query", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    const events = [
      {
        id: "ev-1",
        tenantId: "tenant-1",
        userId: "user-1",
        action: "CREATE" as const,
        entityType: "Customer",
        entityId: "cust-1",
        metadata: {},
        createdAt: new Date(),
      },
    ];
    mockListAuditEvents.mockResolvedValue({ events, total: 1 });

    const res = await GET(request("http://localhost/api/audit"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].entityType).toBe("Customer");
    expect(body.events[0].action).toBe("CREATE");
    expect(body.total).toBe(1);
    expect(mockListAuditEvents).toHaveBeenCalledWith("tenant-1", expect.any(Object));
  });

  it("passes parsed query (entityType, action, page, limit) to listAuditEvents", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockListAuditEvents.mockResolvedValue({ events: [], total: 0 });

    await GET(
      request(
        "http://localhost/api/audit?entityType=Policy&action=CREATE&page=2&limit=20"
      )
    );

    expect(mockListAuditEvents).toHaveBeenCalledWith("tenant-1", {
      entityType: "Policy",
      action: "CREATE",
      page: 2,
      limit: 20,
    });
  });

  it("allows BROKER to access audit (requireRole called with ADMIN and BROKER)", async () => {
    const broker = { ...authUser, role: Role.BROKER };
    mockRequireRole.mockResolvedValue(broker);
    mockListAuditEvents.mockResolvedValue({ events: [], total: 0 });

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(mockRequireRole).toHaveBeenCalledWith([Role.ADMIN, Role.BROKER]);
    expect(mockListAuditEvents).toHaveBeenCalledWith("tenant-1", expect.any(Object));
  });
});
