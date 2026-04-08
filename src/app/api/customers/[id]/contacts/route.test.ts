import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/[id]/contacts/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
}));

vi.mock("@/modules/contacts", () => ({
  listContactsByCustomerId: vi.fn(),
  createContact: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById } = await import("@/modules/customers");
const { listContactsByCustomerId, createContact } = await import("@/modules/contacts");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockListContactsByCustomerId = vi.mocked(listContactsByCustomerId);
const mockCreateContact = vi.mocked(createContact);

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
 * Phase 3: GET/POST /api/customers/[id]/contacts.
 * Covers: 401/403, 404 when customer not found, 200 list, 201 create,
 * 400 validation (POST), 400 when createContact returns null.
 * Does not cover: real DB or session.
 */
describe("GET /api/customers/[id]/contacts", () => {
  it("returns 401 when requireAuth throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockGetCustomerById).not.toHaveBeenCalled();
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
    expect(mockListContactsByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 200 and contacts array when customer exists", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const contacts = [
      {
        id: "con-1",
        tenantId: "tenant-1",
        customerId,
        name: "Jane",
        email: "jane@acme.com",
        phone: null,
        title: null,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockListContactsByCustomerId.mockResolvedValue(contacts);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("con-1");
    expect(body[0].name).toBe("Jane");
    expect(mockListContactsByCustomerId).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });

  it("returns empty array when customer has no contacts", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockListContactsByCustomerId.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/customers/[id]/contacts", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "New Contact" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(401);
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "New Contact" }),
      }),
      { params: params("bad-id") }
    );

    expect(res.status).toBe(404);
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockCreateContact).not.toHaveBeenCalled();
  });

  it("returns 400 when createContact returns null", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockCreateContact.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "New Contact" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Failed to create contact");
  });

  it("returns 201 and created contact when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const created = {
      id: "con-new",
      tenantId: "tenant-1",
      customerId,
      name: "New Contact",
      email: "new@acme.com",
      phone: null,
      title: null,
      isPrimary: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateContact.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          name: "New Contact",
          email: "new@acme.com",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("con-new");
    expect(body.name).toBe("New Contact");
    expect(mockCreateContact).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId,
      expect.objectContaining({
        name: "New Contact",
        email: "new@acme.com",
      })
    );
  });
});
