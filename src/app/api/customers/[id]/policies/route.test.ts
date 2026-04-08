import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/[id]/policies/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
}));

vi.mock("@/modules/policies", () => ({
  listPoliciesByCustomerId: vi.fn(),
  createPolicy: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById } = await import("@/modules/customers");
const {
  listPoliciesByCustomerId,
  createPolicy,
} = await import("@/modules/policies");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockListPoliciesByCustomerId = vi.mocked(listPoliciesByCustomerId);
const mockCreatePolicy = vi.mocked(createPolicy);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
};

const customerId = "cust-1";
const customer = {
  id: customerId,
  tenantId: "tenant-1",
  name: "Acme",
  type: "PRIVATE" as const,
  email: "acme@example.com",
  phone: null as string | null,
  address: null as string | null,
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function params(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 5: GET/POST /api/customers/[id]/policies.
 * Covers: 401/403, 404 when customer not found, 200 list (premium serialized),
 * 201 create, 400 validation, 400 when createPolicy returns null.
 * Does not cover: real DB or session.
 */
describe("GET /api/customers/[id]/policies", () => {
  it("returns 401 when requireAuth throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(401);
    expect(mockListPoliciesByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params("bad-id"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
    expect(mockListPoliciesByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 200 and policies array with serialized premium when customer exists", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const policies = [
      {
        id: "policy-1",
        tenantId: "tenant-1",
        customerId,
        insurerId: "ins-1",
        policyNumber: "POL-2024-001",
        premium: 1500, // Prisma Decimal may serialize; API returns number
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        renewalDate: new Date("2024-12-01"),
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        insurer: { id: "ins-1", name: "If" },
        insuredObjects: [],
      },
    ];
    mockListPoliciesByCustomerId.mockResolvedValue(policies);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].policyNumber).toBe("POL-2024-001");
    expect(body[0].premium).toBe(1500);
    expect(mockListPoliciesByCustomerId).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId
    );
  });

  it("returns empty array when customer has no policies", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockListPoliciesByCustomerId.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/customers/[id]/policies", () => {
  const validBody = {
    insurerId: "ins-1",
    policyNumber: "POL-2024-001",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  };

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(401);
    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      { params: params("bad-id") }
    );

    expect(res.status).toBe(404);
    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (missing policyNumber)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          insurerId: "ins-1",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (endDate before startDate)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          ...validBody,
          startDate: "2024-12-31",
          endDate: "2024-01-01",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    expect(mockCreatePolicy).not.toHaveBeenCalled();
  });

  it("returns 400 when createPolicy returns null", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockCreatePolicy.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Failed to create policy (invalid customer or insurer)"
    );
  });

  it("returns 201 and created policy with serialized premium when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const created = {
      id: "policy-new",
      tenantId: "tenant-1",
      customerId,
      insurerId: "ins-1",
      policyNumber: "POL-2024-001",
      premium: 1200,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
      renewalDate: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreatePolicy.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("policy-new");
    expect(body.policyNumber).toBe("POL-2024-001");
    expect(body.premium).toBe(1200);
    expect(mockCreatePolicy).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId,
      expect.objectContaining({
        insurerId: "ins-1",
        policyNumber: "POL-2024-001",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      })
    );
  });
});
