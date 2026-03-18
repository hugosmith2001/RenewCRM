import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listContactsByCustomerId,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
} from "@/modules/contacts/service";

const mockCustomerFindFirst = vi.fn();
const mockContactFindFirst = vi.fn();
const mockContactFindMany = vi.fn();
const mockContactCreate = vi.fn();
const mockContactUpdate = vi.fn();
const mockContactUpdateMany = vi.fn();
const mockContactDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    customerContact: {
      findFirst: (...args: unknown[]) => mockContactFindFirst(...args),
      findMany: (...args: unknown[]) => mockContactFindMany(...args),
      create: (...args: unknown[]) => mockContactCreate(...args),
      update: (...args: unknown[]) => mockContactUpdate(...args),
      updateMany: (...args: unknown[]) => mockContactUpdateMany(...args),
      delete: (...args: unknown[]) => mockContactDelete(...args),
    },
  },
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const contactId = "contact-1";
const baseContact = {
  id: contactId,
  tenantId,
  customerId,
  name: "Jane Doe",
  email: "jane@example.com",
  phone: null as string | null,
  title: null as string | null,
  isPrimary: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 3: Contact service (tenant-scoped CRUD + primary).
 * Covers: list by customer (empty when customer missing), getById,
 * create (with optional isPrimary unset-others), update (partial + primary),
 * delete, setPrimary. Tenant isolation via where clauses.
 * Does not cover: real DB or API layer.
 */
describe("listContactsByCustomerId", () => {
  it("returns empty array when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await listContactsByCustomerId(tenantId, "bad-customer");

    expect(mockCustomerFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-customer", tenantId },
      select: { id: true },
    });
    expect(mockContactFindMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns contacts ordered by isPrimary desc then name when customer exists", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockContactFindMany.mockResolvedValue([baseContact]);

    const result = await listContactsByCustomerId(tenantId, customerId);

    expect(mockContactFindMany).toHaveBeenCalledWith({
      where: { customerId, tenantId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Jane Doe");
  });
});

describe("getContactById", () => {
  it("returns contact when found for tenant", async () => {
    mockContactFindFirst.mockResolvedValue(baseContact);

    const result = await getContactById(tenantId, contactId);

    expect(mockContactFindFirst).toHaveBeenCalledWith({
      where: { id: contactId, tenantId },
    });
    expect(result).toEqual(baseContact);
  });

  it("returns null when contact does not exist", async () => {
    mockContactFindFirst.mockResolvedValue(null);

    const result = await getContactById(tenantId, "bad-id");

    expect(result).toBeNull();
  });
});

describe("createContact", () => {
  it("returns null when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await createContact(tenantId, "bad-customer", {
      name: "New Contact",
    });

    expect(mockContactCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("creates contact without calling updateMany when isPrimary is false", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockContactCreate.mockResolvedValue({ ...baseContact, id: "new-id" });

    const result = await createContact(tenantId, customerId, {
      name: "New Contact",
      isPrimary: false,
    });

    expect(mockContactUpdateMany).not.toHaveBeenCalled();
    expect(mockContactCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        name: "New Contact",
        email: null,
        phone: null,
        title: null,
        isPrimary: false,
      },
    });
    expect(result).not.toBeNull();
  });

  it("unsets other contacts isPrimary then creates when isPrimary is true", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockContactCreate.mockResolvedValue({
      ...baseContact,
      id: "new-id",
      isPrimary: true,
    });

    await createContact(tenantId, customerId, {
      name: "Primary Contact",
      isPrimary: true,
    });

    expect(mockContactUpdateMany).toHaveBeenCalledWith({
      where: { customerId, tenantId },
      data: { isPrimary: false },
    });
    expect(mockContactCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Primary Contact",
        isPrimary: true,
      }),
    });
  });
});

describe("updateContact", () => {
  it("returns null when contact does not exist for tenant", async () => {
    mockContactFindFirst.mockResolvedValue(null);

    const result = await updateContact(tenantId, "bad-id", { name: "New" });

    expect(mockContactUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates only provided fields", async () => {
    mockContactFindFirst.mockResolvedValue(baseContact);
    const updated = { ...baseContact, name: "Updated Name" };
    mockContactUpdate.mockResolvedValue(updated);

    const result = await updateContact(tenantId, contactId, {
      name: "Updated Name",
    });

    expect(mockContactUpdateMany).not.toHaveBeenCalled();
    expect(mockContactUpdate).toHaveBeenCalledWith({
      where: { id: contactId },
      data: { name: "Updated Name" },
    });
    expect(result).toEqual(updated);
  });

  it("when setting isPrimary true, unsets other contacts then updates", async () => {
    mockContactFindFirst.mockResolvedValue(baseContact);
    mockContactUpdate.mockResolvedValue({ ...baseContact, isPrimary: true });

    await updateContact(tenantId, contactId, { isPrimary: true });

    expect(mockContactUpdateMany).toHaveBeenCalledWith({
      where: { customerId: baseContact.customerId, tenantId },
      data: { isPrimary: false },
    });
    expect(mockContactUpdate).toHaveBeenCalledWith({
      where: { id: contactId },
      data: { isPrimary: true },
    });
  });

  it("clears optional fields when set to undefined via partial", async () => {
    mockContactFindFirst.mockResolvedValue(baseContact);
    mockContactUpdate.mockResolvedValue({ ...baseContact, email: null });

    await updateContact(tenantId, contactId, { email: undefined });

    expect(mockContactUpdate).toHaveBeenCalledWith({
      where: { id: contactId },
      data: {},
    });
  });
});

describe("deleteContact", () => {
  it("returns false when contact does not exist for tenant", async () => {
    mockContactFindFirst.mockResolvedValue(null);

    const result = await deleteContact(tenantId, "bad-id");

    expect(mockContactDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("deletes and returns true when contact exists", async () => {
    mockContactFindFirst.mockResolvedValue(baseContact);
    mockContactDelete.mockResolvedValue(baseContact);

    const result = await deleteContact(tenantId, contactId);

    expect(mockContactDelete).toHaveBeenCalledWith({ where: { id: contactId } });
    expect(result).toBe(true);
  });
});

describe("setPrimaryContact", () => {
  it("returns null when contact does not exist for tenant", async () => {
    mockContactFindFirst.mockResolvedValue(null);

    const result = await setPrimaryContact(tenantId, "bad-id");

    expect(mockContactUpdateMany).not.toHaveBeenCalled();
    expect(mockContactUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("unsets all other contacts isPrimary then sets this contact to primary", async () => {
    mockContactFindFirst.mockResolvedValue(baseContact);
    mockContactUpdate.mockResolvedValue({ ...baseContact, isPrimary: true });

    const result = await setPrimaryContact(tenantId, contactId);

    expect(mockContactUpdateMany).toHaveBeenCalledWith({
      where: { customerId: baseContact.customerId, tenantId },
      data: { isPrimary: false },
    });
    expect(mockContactUpdate).toHaveBeenCalledWith({
      where: { id: contactId },
      data: { isPrimary: true },
    });
    expect(result).not.toBeNull();
    if (result) expect(result.isPrimary).toBe(true);
  });
});
