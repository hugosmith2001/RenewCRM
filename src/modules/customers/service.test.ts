import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCustomerById,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/modules/customers/service";

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const baseCustomer = {
  id: customerId,
  tenantId,
  name: "Acme",
  type: "PRIVATE" as const,
  email: "acme@example.com",
  phone: null as string | null,
  address: null as string | null,
  ownerBrokerId: null as string | null,
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 2: Customer service (tenant-scoped CRUD).
 * Covers: getById (found/not found), list with filters and pagination,
 * create, update (partial + not found), delete (ok/not found).
 * Tenant isolation: all calls use tenantId in where clause.
 * Does not cover: real DB, auth, or API layer.
 */
describe("getCustomerById", () => {
  it("returns customer with owner when found for tenant", async () => {
    const withOwner = {
      ...baseCustomer,
      owner: { id: "u1", name: "Broker", email: "broker@t.com" },
    };
    mockFindFirst.mockResolvedValue(withOwner);

    const result = await getCustomerById(tenantId, customerId);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: customerId, tenantId, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    expect(result).toEqual(withOwner);
  });

  it("returns null when customer does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCustomerById(tenantId, "non-existent");

    expect(result).toBeNull();
  });

  it("returns null when customer belongs to another tenant (findFirst filters by tenantId)", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getCustomerById("other-tenant", customerId);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: customerId, tenantId: "other-tenant", deletedAt: null } })
    );
    expect(result).toBeNull();
  });
});

describe("listCustomers", () => {
  it("returns customers and total with default pagination", async () => {
    const list = [
      { ...baseCustomer, owner: null },
    ];
    mockFindMany.mockResolvedValue(list);
    mockCount.mockResolvedValue(1);

    const { customers, total } = await listCustomers(tenantId, {
      page: 1,
      limit: 20,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, deletedAt: null },
        skip: 0,
        take: 20,
        orderBy: { name: "asc" },
      })
    );
    expect(mockCount).toHaveBeenCalledWith({ where: { tenantId, deletedAt: null } });
    expect(customers).toEqual(list);
    expect(total).toBe(1);
  });

  it("applies search filter (name/email) with tenantId", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listCustomers(tenantId, {
      search: "acme",
      page: 1,
      limit: 20,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: "acme", mode: "insensitive" } },
            { email: { contains: "acme", mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("applies status and type filters", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listCustomers(tenantId, {
      status: "PROSPECT",
      type: "COMPANY",
      page: 1,
      limit: 10,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, deletedAt: null, status: "PROSPECT", type: "COMPANY" },
        skip: 0,
        take: 10,
      })
    );
  });

  it("applies pagination skip correctly", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(50);

    await listCustomers(tenantId, { page: 3, limit: 10 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });
});

describe("createCustomer", () => {
  it("calls prisma.create with tenantId and input data", async () => {
    mockCreate.mockResolvedValue(baseCustomer);

    await createCustomer(tenantId, {
      name: "Acme",
      type: "PRIVATE",
      status: "ACTIVE",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        name: "Acme",
        type: "PRIVATE",
        email: null,
        phone: null,
        address: null,
        ownerBrokerId: null,
        status: "ACTIVE",
      },
    });
  });

  it("passes optional fields when provided", async () => {
    mockCreate.mockResolvedValue(baseCustomer);

    await createCustomer(tenantId, {
      name: "Acme",
      email: "a@b.com",
      phone: "123",
      address: "Street",
      ownerBrokerId: "user-1",
      type: "COMPANY",
      status: "PROSPECT",
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        name: "Acme",
        email: "a@b.com",
        phone: "123",
        address: "Street",
        ownerBrokerId: "user-1",
        type: "COMPANY",
        status: "PROSPECT",
      }),
    });
  });
});

describe("updateCustomer", () => {
  it("returns null when customer does not exist for tenant", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await updateCustomer(tenantId, "bad-id", { name: "New" });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates only provided fields and returns updated customer", async () => {
    mockFindFirst.mockResolvedValue(baseCustomer);
    const updated = { ...baseCustomer, name: "New Name", status: "INACTIVE" };
    mockUpdate.mockResolvedValue(updated);

    const result = await updateCustomer(tenantId, customerId, {
      name: "New Name",
      status: "INACTIVE",
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: customerId },
      data: { name: "New Name", status: "INACTIVE" },
    });
    expect(result).toEqual(updated);
  });

  it("clears ownerBrokerId when set to null", async () => {
    mockFindFirst.mockResolvedValue({ ...baseCustomer, ownerBrokerId: "user-1" });
    mockUpdate.mockResolvedValue({ ...baseCustomer, ownerBrokerId: null });

    await updateCustomer(tenantId, customerId, { ownerBrokerId: null });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: customerId },
      data: { ownerBrokerId: null },
    });
  });
});

describe("deleteCustomer", () => {
  it("returns false when customer does not exist for tenant", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await deleteCustomer(tenantId, "bad-id");

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("soft-deletes and returns true when customer exists", async () => {
    mockFindFirst.mockResolvedValue(baseCustomer);
    mockUpdate.mockResolvedValue({ ...baseCustomer, deletedAt: new Date() });

    const result = await deleteCustomer(tenantId, customerId);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: customerId },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toBe(true);
  });
});
