import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/customers/[id]/contacts/[contactId]/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/contacts", () => ({
  getContactById: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const { getContactById, updateContact, deleteContact } = await import(
  "@/modules/contacts"
);

const mockRequireRole = vi.mocked(requireRole);
const mockGetContactById = vi.mocked(getContactById);
const mockUpdateContact = vi.mocked(updateContact);
const mockDeleteContact = vi.mocked(deleteContact);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
  role: Role.BROKER,
};

const customerId = "cust-1";
const contactId = "con-1";
const contact = {
  id: contactId,
  tenantId: "tenant-1",
  customerId,
  name: "Jane Doe",
  email: "jane@acme.com",
  phone: null as string | null,
  title: null as string | null,
  isPrimary: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function params(custId: string, contId: string) {
  return Promise.resolve({ id: custId, contactId: contId });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 3: PATCH/DELETE /api/customers/[id]/contacts/[contactId].
 * Covers: 401/403, 404 when contact not found, 400 when contact belongs to
 * different customer, 200 PATCH, 204 DELETE, validation 400 on PATCH.
 * Does not cover: real DB or session.
 */
describe("PATCH /api/customers/[id]/contacts/[contactId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: params(customerId, contactId) }
    );

    expect(res.status).toBe(401);
    expect(mockUpdateContact).not.toHaveBeenCalled();
  });

  it("returns 404 when contact not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: params(customerId, "bad-contact") }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Contact not found");
    expect(mockUpdateContact).not.toHaveBeenCalled();
  });

  it("returns 400 when contact belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue({
      ...contact,
      customerId: "other-customer",
    });

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: params(customerId, contactId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Contact does not belong to this customer");
    expect(mockUpdateContact).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(contact);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ email: "not-an-email" }),
      }),
      { params: params(customerId, contactId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockUpdateContact).not.toHaveBeenCalled();
  });

  it("returns 200 and updated contact when valid", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(contact);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = { ...contact, name: "Updated Name" };
    mockUpdateContact.mockResolvedValue(updated);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      }),
      { params: params(customerId, contactId) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
    expect(mockUpdateContact).toHaveBeenCalledWith(
      authUser.tenantId,
      contactId,
      { name: "Updated Name" }
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("DELETE /api/customers/[id]/contacts/[contactId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, contactId),
    });

    expect(res.status).toBe(401);
    expect(mockDeleteContact).not.toHaveBeenCalled();
  });

  it("returns 404 when contact not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-contact"),
    });

    expect(res.status).toBe(404);
    expect(mockDeleteContact).not.toHaveBeenCalled();
  });

  it("returns 400 when contact belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue({
      ...contact,
      customerId: "other-customer",
    });

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, contactId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Contact does not belong to this customer");
    expect(mockDeleteContact).not.toHaveBeenCalled();
  });

  it("returns 204 when contact deleted", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(contact);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeleteContact.mockResolvedValue(true);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, contactId),
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeleteContact).toHaveBeenCalledWith(authUser.tenantId, contactId);
  });
});
