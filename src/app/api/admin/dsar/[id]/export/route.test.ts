import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/dsar/[id]/export/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/modules/dsar", () => ({
  generateDsarExportForRequest: vi.fn(),
  getDsarExportByRequestId: vi.fn(),
}));

const { requireRole } = await import("@/modules/auth");
const { generateDsarExportForRequest, getDsarExportByRequestId } = await import("@/modules/dsar");
const mockRequireRole = vi.mocked(requireRole);
const mockGenerate = vi.mocked(generateDsarExportForRequest);
const mockGet = vi.mocked(getDsarExportByRequestId);

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

describe("POST /api/admin/dsar/:id/export", () => {
  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));
    const res = await POST(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when requireRole throws Forbidden", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden"));
    const res = await POST(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 409 when DSAR is not approved", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGenerate.mockRejectedValue(new Error("DsarRequestNotApproved"));
    const res = await POST(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 201 with export when generated", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGenerate.mockResolvedValue({
      id: "exp-1",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-1",
      status: "COMPLETED",
      formatVersion: 1,
      includeFiles: false,
      completedAt: new Date(),
      exportJson: { formatVersion: 1, subject: { type: "CUSTOMER", id: "cust-1" } },
      exportCsv: { "customer.csv": "id\ncust-1\n" },
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("exp-1");
    expect(mockGenerate).toHaveBeenCalledWith(adminUser, "dsar-1", { includeFiles: false });
  });
});

describe("GET /api/admin/dsar/:id/export", () => {
  it("returns 404 when export not found", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGet.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 when export exists", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGet.mockResolvedValue({
      id: "exp-1",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-1",
      status: "PROCESSING",
      formatVersion: 1,
      includeFiles: false,
      completedAt: null,
      exportJson: null,
      exportCsv: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await GET(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("PROCESSING");
  });
});

