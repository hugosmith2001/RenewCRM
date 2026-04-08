import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
}));

vi.mock("@/modules/audit", () => ({
  logAuditEvent: vi.fn(),
}));

const { requireAuth } = await import("@/modules/auth");
const { listCustomers, createCustomer } = await import("@/modules/customers");
const { logAuditEvent } = await import("@/modules/audit");
const mockRequireAuth = vi.mocked(requireAuth);
const mockListCustomers = vi.mocked(listCustomers);
const mockCreateCustomer = vi.mocked(createCustomer);
const mockLogAuditEvent = vi.mocked(logAuditEvent);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 2: GET/POST /api/customers.
 * Covers: auth (401/403), query validation (400), list success (200),
 * create validation (400), create success (201).
 * Phase 8: POST success calls logAuditEvent with CREATE/Customer (audit wiring).
 * Does not cover: real session, DB, or listCustomersQuerySchema edge cases (tested in validations).
 */
describe("GET /api/customers", () => {
  function request(url = "http://localhost/api/customers") {
    return new NextRequest(url);
  }

  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(request());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 and customers/total when authenticated with valid query", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    const customers = [
      {
        id: "c1",
        tenantId: "tenant-1",
        name: "Acme",
        type: "PRIVATE",
        email: "a@b.com",
        phone: null,
        address: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockListCustomers.mockResolvedValue({ customers, total: 1 });

    const res = await GET(request("http://localhost/api/customers?page=1&limit=20"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.customers).toHaveLength(1);
    expect(body.customers[0].id).toBe("c1");
    expect(body.customers[0].name).toBe("Acme");
    expect(body.total).toBe(1);
    expect(mockListCustomers).toHaveBeenCalledWith("tenant-1", expect.any(Object));
  });

  it("returns 400 when query validation fails", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockListCustomers.mockResolvedValue({ customers: [], total: 0 });

    const res = await GET(request("http://localhost/api/customers?limit=999"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid query");
    expect(body.details).toBeDefined();
    expect(mockListCustomers).not.toHaveBeenCalled();
  });
});

describe("POST /api/customers", () => {
  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Acme" }),
      })
    );

    expect(res.status).toBe(401);
    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireAuth.mockResolvedValue(authUser);

    const res = await POST(
      new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockCreateCustomer).not.toHaveBeenCalled();
  });

  it("returns 201 and created customer when body is valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    const created = {
      id: "cust-new",
      tenantId: "tenant-1",
      name: "New Corp",
      type: "COMPANY",
      email: "new@corp.com",
      phone: null,
      address: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateCustomer.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: "New Corp",
          type: "COMPANY",
          email: "new@corp.com",
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("cust-new");
    expect(body.name).toBe("New Corp");
    expect(body.tenantId).toBe("tenant-1");
    expect(mockCreateCustomer).toHaveBeenCalledWith("tenant-1", expect.any(Object));
  });

  it("calls logAuditEvent with CREATE after successful create (Phase 8 audit)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    const created = {
      id: "cust-audit-test",
      tenantId: "tenant-1",
      name: "Audit Test Corp",
      type: "COMPANY" as const,
      email: "audit@test.com",
      phone: null as string | null,
      address: null as string | null,
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateCustomer.mockResolvedValue(created);

    await POST(
      new NextRequest("http://localhost/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Audit Test Corp", type: "COMPANY", email: "audit@test.com" }),
      })
    );

    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      userId: "user-1",
      action: "CREATE",
      entityType: "Customer",
      entityId: "cust-audit-test",
      metadata: {},
    });
  });
});
