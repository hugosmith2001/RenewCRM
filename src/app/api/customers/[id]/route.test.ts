import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/customers/[id]/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById, updateCustomer, deleteCustomer } = await import("@/modules/customers");
const mockRequireAuth = vi.mocked(requireAuth);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockUpdateCustomer = vi.mocked(updateCustomer);
const mockDeleteCustomer = vi.mocked(deleteCustomer);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

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
 * Phase 2: GET/PATCH/DELETE /api/customers/[id].
 * Covers: 401/403, 404 when customer not found, 200/204 on success,
 * PATCH validation (400), assertTenantAccess called.
 * Does not cover: real DB or auth.
 */
describe("GET /api/customers/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), { params: params(customerId) });

    expect(res.status).toBe(401);
    expect(mockGetCustomerById).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), { params: params("bad-id") });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
    expect(mockAssertTenantAccess).not.toHaveBeenCalled();
  });

  it("returns 200 and customer when found and tenant matches", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);

    const res = await GET(new NextRequest("http://localhost"), { params: params(customerId) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(customerId);
    expect(body.name).toBe("Acme");
    expect(mockGetCustomerById).toHaveBeenCalledWith("tenant-1", customerId);
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });

  it("returns 403 when assertTenantAccess throws", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {
      throw new Error("Forbidden");
    });

    const res = await GET(new NextRequest("http://localhost"), { params: params(customerId) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });
});

describe("PATCH /api/customers/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ name: "X" }) }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(401);
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ name: "X" }) }),
      { params: params("bad-id") }
    );

    expect(res.status).toBe(404);
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ type: "INVALID" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });

  it("returns 200 and updated customer when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = { ...customer, name: "Updated Name" };
    mockUpdateCustomer.mockResolvedValue(updated);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
    expect(mockUpdateCustomer).toHaveBeenCalledWith("tenant-1", customerId, { name: "Updated Name" });
  });
});

describe("DELETE /api/customers/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), { params: params(customerId) });

    expect(res.status).toBe(401);
    expect(mockDeleteCustomer).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), { params: params("bad-id") });

    expect(res.status).toBe(404);
    expect(mockDeleteCustomer).not.toHaveBeenCalled();
  });

  it("returns 204 and calls delete when customer exists", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeleteCustomer.mockResolvedValue(true);

    const res = await DELETE(new NextRequest("http://localhost"), { params: params(customerId) });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeleteCustomer).toHaveBeenCalledWith("tenant-1", customerId);
  });
});
