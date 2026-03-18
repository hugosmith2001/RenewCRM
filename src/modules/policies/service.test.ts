import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listInsurers,
  getInsurerById,
  createInsurer,
  listPoliciesByCustomerId,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "@/modules/policies/service";

const mockInsurerFindMany = vi.fn();
const mockInsurerFindFirst = vi.fn();
const mockInsurerCreate = vi.fn();
const mockCustomerFindFirst = vi.fn();
const mockPolicyFindMany = vi.fn();
const mockPolicyFindFirst = vi.fn();
const mockPolicyCreate = vi.fn();
const mockPolicyUpdate = vi.fn();
const mockPolicyDelete = vi.fn();
const mockInsuredObjectFindMany = vi.fn();
const mockPolicyInsuredObjectDeleteMany = vi.fn();
const mockPolicyInsuredObjectCreateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    insurer: {
      findMany: (...args: unknown[]) => mockInsurerFindMany(...args),
      findFirst: (...args: unknown[]) => mockInsurerFindFirst(...args),
      create: (...args: unknown[]) => mockInsurerCreate(...args),
    },
    customer: {
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    policy: {
      findMany: (...args: unknown[]) => mockPolicyFindMany(...args),
      findFirst: (...args: unknown[]) => mockPolicyFindFirst(...args),
      create: (...args: unknown[]) => mockPolicyCreate(...args),
      update: (...args: unknown[]) => mockPolicyUpdate(...args),
      delete: (...args: unknown[]) => mockPolicyDelete(...args),
    },
    insuredObject: {
      findMany: (...args: unknown[]) => mockInsuredObjectFindMany(...args),
    },
    policyInsuredObject: {
      deleteMany: (...args: unknown[]) =>
        mockPolicyInsuredObjectDeleteMany(...args),
      createMany: (...args: unknown[]) =>
        mockPolicyInsuredObjectCreateMany(...args),
    },
  },
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const insurerId = "ins-1";
const policyId = "policy-1";

const baseInsurer = {
  id: insurerId,
  tenantId,
  name: "If Skadeforsikring",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const basePolicy = {
  id: policyId,
  tenantId,
  customerId,
  insurerId,
  policyNumber: "POL-2024-001",
  premium: 1500,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-12-31"),
  renewalDate: new Date("2024-12-01"),
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 5: Policies service (tenant-scoped insurers + policies CRUD).
 *
 * Covers:
 * - Insurers: listInsurers, getInsurerById, createInsurer (name trim).
 * - Policies: listPoliciesByCustomerId (empty when customer missing), getPolicyById,
 *   createPolicy (customer/insurer missing returns null; insuredObjectIds filtered by customer),
 *   updatePolicy (not found, insurer validation, insuredObjectIds replace),
 *   deletePolicy (not found / success).
 * Does not cover: real DB, API layer, Decimal serialization.
 */
describe("listInsurers", () => {
  it("returns insurers ordered by name", async () => {
    mockInsurerFindMany.mockResolvedValue([baseInsurer]);

    const result = await listInsurers(tenantId);

    expect(mockInsurerFindMany).toHaveBeenCalledWith({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("If Skadeforsikring");
  });

  it("returns empty array when no insurers", async () => {
    mockInsurerFindMany.mockResolvedValue([]);

    const result = await listInsurers(tenantId);

    expect(result).toEqual([]);
  });
});

describe("getInsurerById", () => {
  it("returns insurer when found for tenant", async () => {
    mockInsurerFindFirst.mockResolvedValue(baseInsurer);

    const result = await getInsurerById(tenantId, insurerId);

    expect(mockInsurerFindFirst).toHaveBeenCalledWith({
      where: { id: insurerId, tenantId },
    });
    expect(result).toEqual(baseInsurer);
  });

  it("returns null when insurer does not exist", async () => {
    mockInsurerFindFirst.mockResolvedValue(null);

    const result = await getInsurerById(tenantId, "bad-id");

    expect(result).toBeNull();
  });
});

describe("createInsurer", () => {
  it("creates insurer with trimmed name", async () => {
    mockInsurerCreate.mockResolvedValue({
      ...baseInsurer,
      id: "ins-new",
      name: "New Insurer",
    });

    const result = await createInsurer(tenantId, {
      name: "  New Insurer  ",
    });

    expect(mockInsurerCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        name: "New Insurer",
      },
    });
    expect(result.name).toBe("New Insurer");
  });
});

describe("listPoliciesByCustomerId", () => {
  it("returns empty array when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await listPoliciesByCustomerId(tenantId, "bad-customer");

    expect(mockCustomerFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-customer", tenantId },
      select: { id: true },
    });
    expect(mockPolicyFindMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns policies with insurer and insuredObjects when customer exists", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    const policyWithRelations = {
      ...basePolicy,
      insurer: { id: insurerId, name: "If" },
      insuredObjects: [
        {
          insuredObject: { id: "obj-1", name: "Car", type: "VEHICLE" },
        },
      ],
    };
    mockPolicyFindMany.mockResolvedValue([policyWithRelations]);

    const result = await listPoliciesByCustomerId(tenantId, customerId);

    expect(mockPolicyFindMany).toHaveBeenCalledWith({
      where: { customerId, tenantId },
      include: {
        insurer: { select: { id: true, name: true } },
        insuredObjects: {
          include: {
            insuredObject: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].policyNumber).toBe("POL-2024-001");
    expect(result[0].insurer.name).toBe("If");
  });
});

describe("getPolicyById", () => {
  it("returns policy with relations when found for tenant", async () => {
    const withRelations = {
      ...basePolicy,
      insurer: { id: insurerId, name: "If" },
      insuredObjects: [],
    };
    mockPolicyFindFirst.mockResolvedValue(withRelations);

    const result = await getPolicyById(tenantId, policyId);

    expect(mockPolicyFindFirst).toHaveBeenCalledWith({
      where: { id: policyId, tenantId },
      include: {
        insurer: { select: { id: true, name: true } },
        insuredObjects: {
          include: {
            insuredObject: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });
    expect(result).not.toBeNull();
    if (result) expect(result.insurer.name).toBe("If");
  });

  it("returns null when policy does not exist", async () => {
    mockPolicyFindFirst.mockResolvedValue(null);

    const result = await getPolicyById(tenantId, "bad-id");

    expect(result).toBeNull();
  });
});

describe("createPolicy", () => {
  it("returns null when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await createPolicy(tenantId, "bad-customer", {
      insurerId,
      policyNumber: "POL-1",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });

    expect(mockInsurerFindFirst).not.toHaveBeenCalled();
    expect(mockPolicyCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("returns null when insurer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockInsurerFindFirst.mockResolvedValue(null);

    const result = await createPolicy(tenantId, customerId, {
      insurerId: "bad-insurer",
      policyNumber: "POL-1",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });

    expect(mockPolicyCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("creates policy without insured objects", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockInsurerFindFirst.mockResolvedValue({ id: insurerId });
    mockPolicyCreate.mockResolvedValue(basePolicy);

    const result = await createPolicy(tenantId, customerId, {
      insurerId,
      policyNumber: "POL-2024-001",
      premium: 1500,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      renewalDate: "2024-12-01",
      status: "ACTIVE",
    });

    expect(mockInsuredObjectFindMany).not.toHaveBeenCalled();
    expect(mockPolicyCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        insurerId,
        policyNumber: "POL-2024-001",
        premium: 1500,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        renewalDate: new Date("2024-12-01"),
        status: "ACTIVE",
        insuredObjects: undefined,
      },
    });
    expect(result).not.toBeNull();
  });

  it("creates policy with only valid insured object IDs for this customer", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockInsurerFindFirst.mockResolvedValue({ id: insurerId });
    mockInsuredObjectFindMany.mockResolvedValue([
      { id: "obj-1" },
      { id: "obj-2" },
    ]);
    mockPolicyCreate.mockResolvedValue(basePolicy);

    await createPolicy(tenantId, customerId, {
      insurerId,
      policyNumber: "POL-1",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      insuredObjectIds: ["obj-1", "obj-2", "obj-other-tenant"],
    });

    expect(mockInsuredObjectFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["obj-1", "obj-2", "obj-other-tenant"] },
        customerId,
        tenantId,
      },
      select: { id: true },
    });
    expect(mockPolicyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        insuredObjects: {
          create: [
            { insuredObjectId: "obj-1" },
            { insuredObjectId: "obj-2" },
          ],
        },
      }),
    });
  });
});

describe("updatePolicy", () => {
  it("returns null when policy does not exist for tenant", async () => {
    mockPolicyFindFirst.mockResolvedValue(null);

    const result = await updatePolicy(tenantId, "bad-id", {
      policyNumber: "POL-002",
    });

    expect(mockPolicyUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("returns null when new insurerId is provided but insurer not found", async () => {
    mockPolicyFindFirst.mockResolvedValue({
      id: policyId,
      customerId,
    });
    mockInsurerFindFirst.mockResolvedValue(null);

    const result = await updatePolicy(tenantId, policyId, {
      insurerId: "bad-insurer",
    });

    expect(mockPolicyUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates only provided fields", async () => {
    mockPolicyFindFirst.mockResolvedValue({ id: policyId, customerId });
    mockPolicyUpdate.mockResolvedValue({
      ...basePolicy,
      policyNumber: "POL-2024-002",
    });

    const result = await updatePolicy(tenantId, policyId, {
      policyNumber: "POL-2024-002",
    });

    expect(mockPolicyUpdate).toHaveBeenCalledWith({
      where: { id: policyId },
      data: { policyNumber: "POL-2024-002" },
    });
    expect(result).not.toBeNull();
  });

  it("replaces insuredObjectIds when provided", async () => {
    mockPolicyFindFirst.mockResolvedValue({ id: policyId, customerId });
    mockInsuredObjectFindMany.mockResolvedValue([{ id: "obj-1" }]);
    mockPolicyUpdate.mockResolvedValue(basePolicy);

    await updatePolicy(tenantId, policyId, {
      insuredObjectIds: ["obj-1"],
    });

    expect(mockPolicyInsuredObjectDeleteMany).toHaveBeenCalledWith({
      where: { policyId },
    });
    expect(mockPolicyInsuredObjectCreateMany).toHaveBeenCalledWith({
      data: [{ policyId, insuredObjectId: "obj-1" }],
    });
  });
});

describe("deletePolicy", () => {
  it("returns false when policy does not exist for tenant", async () => {
    mockPolicyFindFirst.mockResolvedValue(null);

    const result = await deletePolicy(tenantId, "bad-id");

    expect(mockPolicyDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("deletes and returns true when policy exists", async () => {
    mockPolicyFindFirst.mockResolvedValue(basePolicy);
    mockPolicyDelete.mockResolvedValue(basePolicy);

    const result = await deletePolicy(tenantId, policyId);

    expect(mockPolicyDelete).toHaveBeenCalledWith({ where: { id: policyId } });
    expect(result).toBe(true);
  });
});
