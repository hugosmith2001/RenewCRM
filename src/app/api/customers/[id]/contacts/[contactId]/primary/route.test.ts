import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/customers/[id]/contacts/[contactId]/primary/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/contacts", () => ({
  getContactById: vi.fn(),
  setPrimaryContact: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getContactById, setPrimaryContact } = await import("@/modules/contacts");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetContactById = vi.mocked(getContactById);
const mockSetPrimaryContact = vi.mocked(setPrimaryContact);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
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
 * Phase 3: POST /api/customers/[id]/contacts/[contactId]/primary.
 * Covers: 401/403, 404 when contact not found, 400 when contact belongs to
 * different customer, 200 and updated contact on success.
 * Does not cover: real DB or session.
 */
describe("POST /api/customers/[id]/contacts/[contactId]/primary", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(new NextRequest("http://localhost"), {
      params: params(customerId, contactId),
    });

    expect(res.status).toBe(401);
    expect(mockSetPrimaryContact).not.toHaveBeenCalled();
  });

  it("returns 404 when contact not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(null);

    const res = await POST(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-contact"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Contact not found");
    expect(mockSetPrimaryContact).not.toHaveBeenCalled();
  });

  it("returns 400 when contact belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue({
      ...contact,
      customerId: "other-customer",
    });

    const res = await POST(new NextRequest("http://localhost"), {
      params: params(customerId, contactId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Contact does not belong to this customer");
    expect(mockSetPrimaryContact).not.toHaveBeenCalled();
  });

  it("returns 200 and contact with isPrimary true on success", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetContactById.mockResolvedValue(contact);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = { ...contact, isPrimary: true };
    mockSetPrimaryContact.mockResolvedValue(updated);

    const res = await POST(new NextRequest("http://localhost"), {
      params: params(customerId, contactId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isPrimary).toBe(true);
    expect(body.id).toBe(contactId);
    expect(mockSetPrimaryContact).toHaveBeenCalledWith(
      authUser.tenantId,
      contactId
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});
