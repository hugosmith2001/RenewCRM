import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/[id]/insured-objects/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
}));

vi.mock("@/modules/insured-objects", () => ({
  listInsuredObjectsByCustomerId: vi.fn(),
  createInsuredObject: vi.fn(),
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById } = await import("@/modules/customers");
const {
  listInsuredObjectsByCustomerId,
  createInsuredObject,
} = await import("@/modules/insured-objects");

const mockRequireRole = vi.mocked(requireRole);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockListInsuredObjectsByCustomerId = vi.mocked(
  listInsuredObjectsByCustomerId
);
const mockCreateInsuredObject = vi.mocked(createInsuredObject);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
  role: Role.BROKER,
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
  ownerBrokerId: null as string | null,
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  owner: null,
};

function params(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 4: GET/POST /api/customers/[id]/insured-objects.
 * Covers: 401/403, 404 when customer not found, 200 list, 201 create,
 * 400 validation (POST), 400 when createInsuredObject returns null.
 * Does not cover: real DB or session.
 */
describe("GET /api/customers/[id]/insured-objects", () => {
  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGetCustomerById).not.toHaveBeenCalled();
  });

  it("returns 403 when requireRole throws Forbidden", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(403);
    expect(mockListInsuredObjectsByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params("bad-id"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
    expect(mockListInsuredObjectsByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 200 and insured objects array when customer exists", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const objects = [
      {
        id: "obj-1",
        tenantId: "tenant-1",
        customerId,
        type: "VEHICLE",
        name: "2019 Honda Civic",
        description: "Silver",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockListInsuredObjectsByCustomerId.mockResolvedValue(objects);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("obj-1");
    expect(body[0].name).toBe("2019 Honda Civic");
    expect(mockListInsuredObjectsByCustomerId).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });

  it("returns empty array when customer has no insured objects", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockListInsuredObjectsByCustomerId.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/customers/[id]/insured-objects", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          type: "PROPERTY",
          name: "Main office",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(401);
    expect(mockCreateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          type: "PROPERTY",
          name: "Main office",
        }),
      }),
      { params: params("bad-id") }
    );

    expect(res.status).toBe(404);
    expect(mockCreateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (missing type)", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "Main office" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockCreateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (empty name)", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "PROPERTY", name: "" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    expect(mockCreateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 400 when createInsuredObject returns null", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockCreateInsuredObject.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          type: "PROPERTY",
          name: "Main office",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Failed to create insured object");
  });

  it("returns 201 and created object when valid", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const created = {
      id: "obj-new",
      tenantId: "tenant-1",
      customerId,
      type: "PROPERTY",
      name: "Main office",
      description: "Building at 123 Main St",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateInsuredObject.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          type: "PROPERTY",
          name: "Main office",
          description: "Building at 123 Main St",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("obj-new");
    expect(body.name).toBe("Main office");
    expect(body.type).toBe("PROPERTY");
    expect(mockCreateInsuredObject).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId,
      expect.objectContaining({
        type: "PROPERTY",
        name: "Main office",
        description: "Building at 123 Main St",
      })
    );
  });
});
