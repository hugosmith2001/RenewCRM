import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listInsuredObjectsByCustomerId,
  getInsuredObjectById,
  createInsuredObject,
  updateInsuredObject,
  deleteInsuredObject,
} from "@/modules/insured-objects/service";

const mockCustomerFindFirst = vi.fn();
const mockInsuredObjectFindFirst = vi.fn();
const mockInsuredObjectFindMany = vi.fn();
const mockInsuredObjectCreate = vi.fn();
const mockInsuredObjectUpdate = vi.fn();
const mockInsuredObjectDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    insuredObject: {
      findFirst: (...args: unknown[]) => mockInsuredObjectFindFirst(...args),
      findMany: (...args: unknown[]) => mockInsuredObjectFindMany(...args),
      create: (...args: unknown[]) => mockInsuredObjectCreate(...args),
      update: (...args: unknown[]) => mockInsuredObjectUpdate(...args),
      delete: (...args: unknown[]) => mockInsuredObjectDelete(...args),
    },
  },
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const objectId = "obj-1";
const baseObject = {
  id: objectId,
  tenantId,
  customerId,
  type: "VEHICLE" as const,
  name: "2019 Honda Civic",
  description: "Silver, reg ABC123" as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 4: Insured object service (tenant-scoped CRUD).
 * Covers: list by customer (empty when customer missing), getById,
 * create (customer missing / success), update (not found / partial fields),
 * delete (not found / success). Tenant isolation via where clauses.
 * Does not cover: real DB or API layer.
 */
describe("listInsuredObjectsByCustomerId", () => {
  it("returns empty array when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await listInsuredObjectsByCustomerId(
      tenantId,
      "bad-customer"
    );

    expect(mockCustomerFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-customer", tenantId },
      select: { id: true },
    });
    expect(mockInsuredObjectFindMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns objects ordered by type then name when customer exists", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockInsuredObjectFindMany.mockResolvedValue([baseObject]);

    const result = await listInsuredObjectsByCustomerId(
      tenantId,
      customerId
    );

    expect(mockInsuredObjectFindMany).toHaveBeenCalledWith({
      where: { customerId, tenantId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("2019 Honda Civic");
    expect(result[0].type).toBe("VEHICLE");
  });
});

describe("getInsuredObjectById", () => {
  it("returns object when found for tenant", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(baseObject);

    const result = await getInsuredObjectById(tenantId, objectId);

    expect(mockInsuredObjectFindFirst).toHaveBeenCalledWith({
      where: { id: objectId, tenantId },
    });
    expect(result).toEqual(baseObject);
  });

  it("returns null when object does not exist", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(null);

    const result = await getInsuredObjectById(tenantId, "bad-id");

    expect(result).toBeNull();
  });
});

describe("createInsuredObject", () => {
  it("returns null when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await createInsuredObject(tenantId, "bad-customer", {
      type: "PROPERTY",
      name: "Main office",
    });

    expect(mockInsuredObjectCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("creates object with type, name, and optional description", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    const created = { ...baseObject, id: "obj-new", name: "Main office" };
    mockInsuredObjectCreate.mockResolvedValue(created);

    const result = await createInsuredObject(tenantId, customerId, {
      type: "PROPERTY",
      name: "Main office",
      description: "Building at 123 Main St",
    });

    expect(mockInsuredObjectCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        type: "PROPERTY",
        name: "Main office",
        description: "Building at 123 Main St",
      },
    });
    expect(result).not.toBeNull();
    if (result) expect(result.name).toBe("Main office");
  });

  it("creates object with null description when description omitted", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockInsuredObjectCreate.mockResolvedValue({
      ...baseObject,
      description: null,
    });

    await createInsuredObject(tenantId, customerId, {
      type: "EQUIPMENT",
      name: "Server rack",
    });

    expect(mockInsuredObjectCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        type: "EQUIPMENT",
        name: "Server rack",
        description: null,
      },
    });
  });
});

describe("updateInsuredObject", () => {
  it("returns null when object does not exist for tenant", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(null);

    const result = await updateInsuredObject(tenantId, "bad-id", {
      name: "Updated",
    });

    expect(mockInsuredObjectUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates only provided fields", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(baseObject);
    const updated = { ...baseObject, name: "2020 Honda Civic" };
    mockInsuredObjectUpdate.mockResolvedValue(updated);

    const result = await updateInsuredObject(tenantId, objectId, {
      name: "2020 Honda Civic",
    });

    expect(mockInsuredObjectUpdate).toHaveBeenCalledWith({
      where: { id: objectId },
      data: { name: "2020 Honda Civic" },
    });
    expect(result).toEqual(updated);
  });

  it("updates type and description", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(baseObject);
    mockInsuredObjectUpdate.mockResolvedValue({
      ...baseObject,
      type: "OTHER",
      description: "Updated desc",
    });

    await updateInsuredObject(tenantId, objectId, {
      type: "OTHER",
      description: "Updated desc",
    });

    expect(mockInsuredObjectUpdate).toHaveBeenCalledWith({
      where: { id: objectId },
      data: { type: "OTHER", description: "Updated desc" },
    });
  });

  it("passes empty data when no fields provided (partial)", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(baseObject);
    mockInsuredObjectUpdate.mockResolvedValue(baseObject);

    await updateInsuredObject(tenantId, objectId, {});

    expect(mockInsuredObjectUpdate).toHaveBeenCalledWith({
      where: { id: objectId },
      data: {},
    });
  });
});

describe("deleteInsuredObject", () => {
  it("returns false when object does not exist for tenant", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(null);

    const result = await deleteInsuredObject(tenantId, "bad-id");

    expect(mockInsuredObjectDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("deletes and returns true when object exists", async () => {
    mockInsuredObjectFindFirst.mockResolvedValue(baseObject);
    mockInsuredObjectDelete.mockResolvedValue(baseObject);

    const result = await deleteInsuredObject(tenantId, objectId);

    expect(mockInsuredObjectDelete).toHaveBeenCalledWith({
      where: { id: objectId },
    });
    expect(result).toBe(true);
  });
});
