import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/dsar/[id]/export/download/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/modules/dsar", () => ({
  getDsarExportByRequestId: vi.fn(),
}));

const { requireRole } = await import("@/modules/auth");
const { getDsarExportByRequestId } = await import("@/modules/dsar");
const mockRequireRole = vi.mocked(requireRole);
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

describe("GET /api/admin/dsar/:id/export/download", () => {
  it("returns 409 when export not ready", async () => {
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

    const res = await GET(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export/download?format=json"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("downloads JSON when completed", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGet.mockResolvedValue({
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

    const res = await GET(new NextRequest("http://localhost/api/admin/dsar/dsar-1/export/download?format=json"), {
      params: Promise.resolve({ id: "dsar-1" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain(".json");
    const body = await res.text();
    expect(body).toContain('"formatVersion": 1');
  });

  it("downloads a CSV file when requested", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockGet.mockResolvedValue({
      id: "exp-1",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-1",
      status: "COMPLETED",
      formatVersion: 1,
      includeFiles: false,
      completedAt: new Date(),
      exportJson: { formatVersion: 1 },
      exportCsv: { "contacts.csv": "id,name\nc1,Alice\n" },
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await GET(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1/export/download?format=csv&file=contacts.csv"),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("id,name");
  });
});

