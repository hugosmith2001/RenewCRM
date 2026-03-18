import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listActivitiesByCustomerId,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} from "@/modules/activities/service";

const mockCustomerFindFirst = vi.fn();
const mockActivityFindFirst = vi.fn();
const mockActivityFindMany = vi.fn();
const mockActivityCreate = vi.fn();
const mockActivityUpdate = vi.fn();
const mockActivityDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    activity: {
      findFirst: (...args: unknown[]) => mockActivityFindFirst(...args),
      findMany: (...args: unknown[]) => mockActivityFindMany(...args),
      create: (...args: unknown[]) => mockActivityCreate(...args),
      update: (...args: unknown[]) => mockActivityUpdate(...args),
      delete: (...args: unknown[]) => mockActivityDelete(...args),
    },
  },
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const activityId = "act-1";
const baseActivity = {
  id: activityId,
  tenantId,
  customerId,
  type: "NOTE" as const,
  subject: "Note",
  body: "Some notes.",
  createdAt: new Date(),
  createdById: "user-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 7: Activities service (tenant- and customer-scoped CRUD).
 * Covers: list by customer (empty when customer missing), getById,
 * create (with optional createdById), update partial, delete. Tenant isolation.
 * Does not cover: real DB or API layer.
 */
describe("listActivitiesByCustomerId", () => {
  it("returns empty array when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await listActivitiesByCustomerId(tenantId, "bad-customer");

    expect(mockCustomerFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-customer", tenantId },
      select: { id: true },
    });
    expect(mockActivityFindMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns activities ordered by createdAt desc when customer exists", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    const activities = [
      { ...baseActivity, createdBy: { id: "user-1", name: "Broker", email: "b@t.local" } },
    ];
    mockActivityFindMany.mockResolvedValue(activities);

    const result = await listActivitiesByCustomerId(tenantId, customerId);

    expect(mockActivityFindMany).toHaveBeenCalledWith({
      where: { customerId, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("NOTE");
    expect(result[0].subject).toBe("Note");
  });
});

describe("getActivityById", () => {
  it("returns activity when found for tenant", async () => {
    const withCreator = {
      ...baseActivity,
      createdBy: { id: "user-1", name: "Broker", email: "b@t.local" },
    };
    mockActivityFindFirst.mockResolvedValue(withCreator);

    const result = await getActivityById(tenantId, activityId);

    expect(mockActivityFindFirst).toHaveBeenCalledWith({
      where: { id: activityId, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    expect(result).toEqual(withCreator);
  });

  it("returns null when activity does not exist", async () => {
    mockActivityFindFirst.mockResolvedValue(null);

    const result = await getActivityById(tenantId, "bad-id");

    expect(result).toBeNull();
  });
});

describe("createActivity", () => {
  it("returns null when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await createActivity(tenantId, "bad-customer", {
      type: "NOTE",
      subject: "Test",
    });

    expect(mockActivityCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("creates activity with createdById when provided", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockActivityCreate.mockResolvedValue({ ...baseActivity, id: "act-new" });

    const result = await createActivity(
      tenantId,
      customerId,
      { type: "CALL", subject: "Call", body: "Left message" },
      "user-1"
    );

    expect(mockActivityCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        type: "CALL",
        subject: "Call",
        body: "Left message",
        createdById: "user-1",
      },
    });
    expect(result).not.toBeNull();
  });

  it("creates activity without createdById when not provided", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockActivityCreate.mockResolvedValue({ ...baseActivity, id: "act-new", createdById: null });

    await createActivity(tenantId, customerId, { type: "NOTE" });

    expect(mockActivityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: null,
      }),
    });
  });
});

describe("updateActivity", () => {
  it("returns null when activity does not exist for tenant", async () => {
    mockActivityFindFirst.mockResolvedValue(null);

    const result = await updateActivity(tenantId, "bad-id", { subject: "Updated" });

    expect(mockActivityUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates only provided fields", async () => {
    mockActivityFindFirst.mockResolvedValue(baseActivity);
    const updated = { ...baseActivity, subject: "Updated subject" };
    mockActivityUpdate.mockResolvedValue(updated);

    const result = await updateActivity(tenantId, activityId, {
      subject: "Updated subject",
    });

    expect(mockActivityUpdate).toHaveBeenCalledWith({
      where: { id: activityId },
      data: { subject: "Updated subject" },
    });
    expect(result).toEqual(updated);
  });

  it("updates type and body", async () => {
    mockActivityFindFirst.mockResolvedValue(baseActivity);
    mockActivityUpdate.mockResolvedValue({ ...baseActivity, type: "MEETING", body: "New body" });

    await updateActivity(tenantId, activityId, {
      type: "MEETING",
      body: "New body",
    });

    expect(mockActivityUpdate).toHaveBeenCalledWith({
      where: { id: activityId },
      data: { type: "MEETING", body: "New body" },
    });
  });
});

describe("deleteActivity", () => {
  it("returns false when activity does not exist for tenant", async () => {
    mockActivityFindFirst.mockResolvedValue(null);

    const result = await deleteActivity(tenantId, "bad-id");

    expect(mockActivityDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("deletes and returns true when activity exists", async () => {
    mockActivityFindFirst.mockResolvedValue(baseActivity);
    mockActivityDelete.mockResolvedValue(baseActivity);

    const result = await deleteActivity(tenantId, activityId);

    expect(mockActivityDelete).toHaveBeenCalledWith({ where: { id: activityId } });
    expect(result).toBe(true);
  });
});
