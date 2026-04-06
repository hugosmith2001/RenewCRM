import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/dsar/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/modules/dsar", () => ({
  createDsarRequest: vi.fn(),
  listDsarRequests: vi.fn(),
}));

const { requireRole } = await import("@/modules/auth");
const { createDsarRequest, listDsarRequests } = await import("@/modules/dsar");
const mockRequireRole = vi.mocked(requireRole);
const mockCreateDsarRequest = vi.mocked(createDsarRequest);
const mockListDsarRequests = vi.mocked(listDsarRequests);

const adminUser = {
  id: "user-1",
  email: "admin@tenant.local",
  name: "Admin",
  tenantId: "tenant-1",
  role: Role.ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/dsar", () => {
  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));
    const res = await GET(new NextRequest("http://localhost/api/admin/dsar"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when requireRole throws Forbidden", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden"));
    const res = await GET(new NextRequest("http://localhost/api/admin/dsar"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when query validation fails", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    const res = await GET(new NextRequest("http://localhost/api/admin/dsar?limit=999"));
    expect(res.status).toBe(400);
    expect(mockListDsarRequests).not.toHaveBeenCalled();
  });

  it("returns 200 with requests/total when authenticated", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockListDsarRequests.mockResolvedValue({
      requests: [
        {
          id: "dsar-1",
          tenantId: "tenant-1",
          requestType: "EXPORT",
          subjectType: "CUSTOMER",
          subjectRefId: "ckaaaaaaaaaaaaaaaaaaaaaaaaaa",
          status: "PENDING",
          createdByUserId: "user-1",
          updatedByUserId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/dsar?page=1&limit=50"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0].id).toBe("dsar-1");
  });
});

describe("POST /api/admin/dsar", () => {
  it("returns 400 when body validation fails", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    const res = await POST(
      new NextRequest("http://localhost/api/admin/dsar", {
        method: "POST",
        body: JSON.stringify({ requestType: "EXPORT" }),
      })
    );
    expect(res.status).toBe(400);
    expect(mockCreateDsarRequest).not.toHaveBeenCalled();
  });

  it("returns 404 when subject not found", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockCreateDsarRequest.mockRejectedValue(new Error("SubjectNotFound"));

    const res = await POST(
      new NextRequest("http://localhost/api/admin/dsar", {
        method: "POST",
        body: JSON.stringify({
          requestType: "EXPORT",
          subjectType: "CUSTOMER",
          subjectRefId: "ckaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      })
    );

    expect(res.status).toBe(404);
  });

  it("returns 201 with created request when valid", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockCreateDsarRequest.mockResolvedValue({
      id: "dsar-new",
      tenantId: "tenant-1",
      requestType: "EXPORT",
      subjectType: "CUSTOMER",
      subjectRefId: "ckaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "PENDING",
      createdByUserId: "user-1",
      updatedByUserId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: null,
      actions: [],
    });

    const res = await POST(
      new NextRequest("http://localhost/api/admin/dsar", {
        method: "POST",
        body: JSON.stringify({
          requestType: "EXPORT",
          subjectType: "CUSTOMER",
          subjectRefId: "ckaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("dsar-new");
    expect(mockCreateDsarRequest).toHaveBeenCalledTimes(1);
  });
});

