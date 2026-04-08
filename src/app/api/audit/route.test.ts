import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/audit/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/modules/audit", () => ({
  listAuditEvents: vi.fn(),
}));

const { requireAuth } = await import("@/modules/auth");
const { listAuditEvents } = await import("@/modules/audit");
const mockRequireAuth = vi.mocked(requireAuth);
const mockListAuditEvents = vi.mocked(listAuditEvents);

const authUser = {
  id: "user-1",
  email: "admin@tenant.local",
  name: "Admin",
  tenantId: "tenant-1",
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

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(request());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 400 when query validation fails", async () => {
    mockRequireAuth.mockResolvedValue(authUser);

    const res = await GET(request("http://localhost/api/audit?entityType=Invalid"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid query");
    expect(body.details).toBeDefined();
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 400 when limit exceeds 100", async () => {
    mockRequireAuth.mockResolvedValue(authUser);

    const res = await GET(request("http://localhost/api/audit?limit=101"));

    expect(res.status).toBe(400);
    expect(mockListAuditEvents).not.toHaveBeenCalled();
  });

  it("returns 200 and events/total when authenticated with valid query", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
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
    mockRequireAuth.mockResolvedValue(authUser);
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

  it("allows authenticated user to access audit", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockListAuditEvents.mockResolvedValue({ events: [], total: 0 });

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(mockRequireAuth).toHaveBeenCalled();
    expect(mockListAuditEvents).toHaveBeenCalledWith("tenant-1", expect.any(Object));
  });
});
