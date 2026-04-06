import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/admin/dsar/[id]/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/modules/dsar", () => ({
  getDsarRequestById: vi.fn(),
  transitionDsarStatus: vi.fn(),
}));

const { requireRole } = await import("@/modules/auth");
const { getDsarRequestById, transitionDsarStatus } = await import("@/modules/dsar");
const mockRequireRole = vi.mocked(requireRole);
const mockGetDsarRequestById = vi.mocked(getDsarRequestById);
const mockTransitionDsarStatus = vi.mocked(transitionDsarStatus);

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

describe("GET /api/admin/dsar/:id", () => {
  it("returns 404 when request not found", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGetDsarRequestById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/admin/dsar/dsar-1"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 200 when found", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGetDsarRequestById.mockResolvedValue({
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
      notes: null,
      actions: [],
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/dsar/dsar-1"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("dsar-1");
  });
});

describe("PATCH /api/admin/dsar/:id", () => {
  it("returns 400 when body validation fails", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    const res = await PATCH(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "NOT_A_STATUS" }),
      }),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );
    expect(res.status).toBe(400);
    expect(mockTransitionDsarStatus).not.toHaveBeenCalled();
  });

  it("returns 409 when transition is invalid", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockTransitionDsarStatus.mockRejectedValue(new Error("InvalidStatusTransition"));

    const res = await PATCH(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      }),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );

    expect(res.status).toBe(409);
  });

  it("returns 404 when request not found", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockTransitionDsarStatus.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_REVIEW" }),
      }),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );

    expect(res.status).toBe(404);
  });

  it("returns 200 when updated", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockTransitionDsarStatus.mockResolvedValue({
      id: "dsar-1",
      tenantId: "tenant-1",
      requestType: "EXPORT",
      subjectType: "CUSTOMER",
      subjectRefId: "ckaaaaaaaaaaaaaaaaaaaaaaaaaa",
      status: "IN_REVIEW",
      createdByUserId: "user-1",
      updatedByUserId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: null,
      actions: [],
    });

    const res = await PATCH(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "IN_REVIEW" }),
      }),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("IN_REVIEW");
  });
});

