import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET,
  PATCH,
  DELETE,
} from "@/app/api/customers/[id]/policies/[policyId]/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/policies", () => ({
  getPolicyById: vi.fn(),
  updatePolicy: vi.fn(),
  deletePolicy: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const {
  getPolicyById,
  updatePolicy,
  deletePolicy,
} = await import("@/modules/policies");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetPolicyById = vi.mocked(getPolicyById);
const mockUpdatePolicy = vi.mocked(updatePolicy);
const mockDeletePolicy = vi.mocked(deletePolicy);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
};

const customerId = "cust-1";
const policyId = "policy-1";
const policyWithRelations = {
  id: policyId,
  tenantId: "tenant-1",
  customerId,
  insurerId: "ins-1",
  policyNumber: "POL-2024-001",
  premium: 1500,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-12-31"),
  renewalDate: new Date("2024-12-01"),
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date(),
  insurer: { id: "ins-1", name: "If" },
  insuredObjects: [
    { insuredObject: { id: "obj-1", name: "Car", type: "VEHICLE" } },
  ],
};

function params(custId: string, polId: string) {
  return Promise.resolve({ id: custId, policyId: polId });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 5: GET/PATCH/DELETE /api/customers/[id]/policies/[policyId].
 * Covers: 401/403, 404 when policy not found, 400 when policy belongs to
 * different customer, 200 GET (with insuredObjectIds), 200 PATCH, 204 DELETE,
 * 400 validation on PATCH.
 * Does not cover: real DB or session.
 */
describe("GET /api/customers/[id]/policies/[policyId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, policyId),
    });

    expect(res.status).toBe(401);
    expect(mockGetPolicyById).not.toHaveBeenCalled();
  });

  it("returns 404 when policy not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-policy"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Policy not found");
  });

  it("returns 400 when policy belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue({
      ...policyWithRelations,
      customerId: "other-customer",
    });

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, policyId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Policy does not belong to this customer");
  });

  it("returns 200 and policy with insuredObjectIds and serialized premium", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(policyWithRelations);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, policyId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(policyId);
    expect(body.policyNumber).toBe("POL-2024-001");
    expect(body.premium).toBe(1500);
    expect(body.insuredObjectIds).toEqual(["obj-1"]);
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("PATCH /api/customers/[id]/policies/[policyId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ policyNumber: "POL-002" }),
      }),
      { params: params(customerId, policyId) }
    );

    expect(res.status).toBe(401);
    expect(mockUpdatePolicy).not.toHaveBeenCalled();
  });

  it("returns 404 when policy not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ policyNumber: "POL-002" }),
      }),
      { params: params(customerId, "bad-policy") }
    );

    expect(res.status).toBe(404);
    expect(mockUpdatePolicy).not.toHaveBeenCalled();
  });

  it("returns 400 when policy belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue({
      ...policyWithRelations,
      customerId: "other-customer",
    });

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ policyNumber: "POL-002" }),
      }),
      { params: params(customerId, policyId) }
    );

    expect(res.status).toBe(400);
    expect(mockUpdatePolicy).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(policyWithRelations);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          startDate: "2024-12-31",
          endDate: "2024-01-01",
        }),
      }),
      { params: params(customerId, policyId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockUpdatePolicy).not.toHaveBeenCalled();
  });

  it("returns 200 and updated policy when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(policyWithRelations);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = {
      ...policyWithRelations,
      policyNumber: "POL-2024-002",
      status: "EXPIRED",
    };
    mockUpdatePolicy.mockResolvedValue(updated);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          policyNumber: "POL-2024-002",
          status: "EXPIRED",
        }),
      }),
      { params: params(customerId, policyId) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.policyNumber).toBe("POL-2024-002");
    expect(body.status).toBe("EXPIRED");
    expect(mockUpdatePolicy).toHaveBeenCalledWith(
      authUser.tenantId,
      policyId,
      expect.objectContaining({
        policyNumber: "POL-2024-002",
        status: "EXPIRED",
      })
    );
  });
});

describe("DELETE /api/customers/[id]/policies/[policyId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, policyId),
    });

    expect(res.status).toBe(401);
    expect(mockDeletePolicy).not.toHaveBeenCalled();
  });

  it("returns 404 when policy not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-policy"),
    });

    expect(res.status).toBe(404);
    expect(mockDeletePolicy).not.toHaveBeenCalled();
  });

  it("returns 400 when policy belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue({
      ...policyWithRelations,
      customerId: "other-customer",
    });

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, policyId),
    });

    expect(res.status).toBe(400);
    expect(mockDeletePolicy).not.toHaveBeenCalled();
  });

  it("returns 204 and calls deletePolicy when policy exists and belongs to customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetPolicyById.mockResolvedValue(policyWithRelations);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeletePolicy.mockResolvedValue(undefined);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, policyId),
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeletePolicy).toHaveBeenCalledWith(authUser.tenantId, policyId);
  });
});
