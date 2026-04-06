import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/dsar/[id]/erase/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/modules/dsar", () => ({
  executeDsarErasure: vi.fn(),
}));

const { requireRole } = await import("@/modules/auth");
const { executeDsarErasure } = await import("@/modules/dsar");
const mockRequireRole = vi.mocked(requireRole);
const mockExecute = vi.mocked(executeDsarErasure);

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

describe("POST /api/admin/dsar/:id/erase", () => {
  it("returns 409 when DSAR is not approved", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockExecute.mockRejectedValue(new Error("DsarRequestNotApproved"));
    const res = await POST(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1/erase", {
        method: "POST",
        body: JSON.stringify({ reason: "x" }),
      }),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );
    expect(res.status).toBe(409);
  });

  it("returns 201 when executed", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockExecute.mockResolvedValue({ ok: true });
    const res = await POST(
      new NextRequest("http://localhost/api/admin/dsar/dsar-1/erase", {
        method: "POST",
        body: JSON.stringify({ reason: "DSAR erasure/anonymization" }),
      }),
      { params: Promise.resolve({ id: "dsar-1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockExecute).toHaveBeenCalledWith(adminUser, "dsar-1", { reason: "DSAR erasure/anonymization" });
  });
});

