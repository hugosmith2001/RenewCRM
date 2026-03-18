import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listTasksByCustomerId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "@/modules/tasks/service";

const mockCustomerFindFirst = vi.fn();
const mockUserFindFirst = vi.fn();
const mockTaskFindFirst = vi.fn();
const mockTaskFindMany = vi.fn();
const mockTaskCreate = vi.fn();
const mockTaskUpdate = vi.fn();
const mockTaskDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    task: {
      findFirst: (...args: unknown[]) => mockTaskFindFirst(...args),
      findMany: (...args: unknown[]) => mockTaskFindMany(...args),
      create: (...args: unknown[]) => mockTaskCreate(...args),
      update: (...args: unknown[]) => mockTaskUpdate(...args),
      delete: (...args: unknown[]) => mockTaskDelete(...args),
    },
  },
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const taskId = "task-1";
const userId = "user-1";
const baseTask = {
  id: taskId,
  tenantId,
  customerId,
  title: "Follow up",
  description: "Call client",
  dueDate: new Date("2025-04-01"),
  priority: "MEDIUM" as const,
  status: "PENDING" as const,
  assignedToUserId: null as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 7: Tasks service (tenant- and customer-scoped CRUD, assignee validation).
 * Covers: list by customer (empty when customer missing), getById,
 * create (with/without assignee; null when assignee not in tenant), update partial,
 * update with new assignee (null when assignee not in tenant), delete. Tenant isolation.
 * Does not cover: real DB or API layer.
 */
describe("listTasksByCustomerId", () => {
  it("returns empty array when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await listTasksByCustomerId(tenantId, "bad-customer");

    expect(mockCustomerFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-customer", tenantId },
      select: { id: true },
    });
    expect(mockTaskFindMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns tasks with assignee when customer exists", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    const tasks = [
      {
        ...baseTask,
        assignedTo: { id: userId, name: "Broker", email: "b@t.local" },
      },
    ];
    mockTaskFindMany.mockResolvedValue(tasks);

    const result = await listTasksByCustomerId(tenantId, customerId);

    expect(mockTaskFindMany).toHaveBeenCalledWith({
      where: { customerId, tenantId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Follow up");
  });
});

describe("getTaskById", () => {
  it("returns task when found for tenant", async () => {
    const withAssignee = {
      ...baseTask,
      assignedTo: { id: userId, name: "Broker", email: "b@t.local" },
    };
    mockTaskFindFirst.mockResolvedValue(withAssignee);

    const result = await getTaskById(tenantId, taskId);

    expect(mockTaskFindFirst).toHaveBeenCalledWith({
      where: { id: taskId, tenantId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    expect(result).toEqual(withAssignee);
  });

  it("returns null when task does not exist", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const result = await getTaskById(tenantId, "bad-id");

    expect(result).toBeNull();
  });
});

describe("createTask", () => {
  it("returns null when customer does not exist for tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);

    const result = await createTask(tenantId, "bad-customer", {
      title: "New task",
    });

    expect(mockTaskCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("creates task without assignee when assignedToUserId not provided", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockTaskCreate.mockResolvedValue({ ...baseTask, id: "task-new" });

    const result = await createTask(tenantId, customerId, {
      title: "New task",
      description: "Details",
    });

    expect(mockUserFindFirst).not.toHaveBeenCalled();
    expect(mockTaskCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        customerId,
        title: "New task",
        description: "Details",
        dueDate: null,
        priority: "MEDIUM",
        status: "PENDING",
        assignedToUserId: null,
      },
    });
    expect(result).not.toBeNull();
  });

  it("returns null when assignee user is not in tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockUserFindFirst.mockResolvedValue(null);

    const result = await createTask(tenantId, customerId, {
      title: "New task",
      assignedToUserId: "other-tenant-user",
    });

    expect(mockUserFindFirst).toHaveBeenCalledWith({
      where: { id: "other-tenant-user", tenantId },
      select: { id: true },
    });
    expect(mockTaskCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("creates task with assignee when user exists in tenant", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockUserFindFirst.mockResolvedValue({ id: userId });
    mockTaskCreate.mockResolvedValue({ ...baseTask, id: "task-new", assignedToUserId: userId });

    const result = await createTask(tenantId, customerId, {
      title: "Assigned task",
      assignedToUserId: userId,
    });

    expect(mockTaskCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Assigned task",
        assignedToUserId: userId,
      }),
    });
    expect(result).not.toBeNull();
  });
});

describe("updateTask", () => {
  it("returns null when task does not exist for tenant", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const result = await updateTask(tenantId, "bad-id", { title: "Updated" });

    expect(mockTaskUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates only provided fields", async () => {
    mockTaskFindFirst.mockResolvedValue(baseTask);
    const updated = { ...baseTask, title: "Updated title" };
    mockTaskUpdate.mockResolvedValue(updated);

    const result = await updateTask(tenantId, taskId, {
      title: "Updated title",
    });

    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: taskId },
      data: { title: "Updated title" },
    });
    expect(result).toEqual(updated);
  });

  it("returns null when updating assignee to user not in tenant", async () => {
    mockTaskFindFirst.mockResolvedValue(baseTask);
    mockUserFindFirst.mockResolvedValue(null);

    const result = await updateTask(tenantId, taskId, {
      assignedToUserId: "other-tenant-user",
    });

    expect(mockUserFindFirst).toHaveBeenCalledWith({
      where: { id: "other-tenant-user", tenantId },
      select: { id: true },
    });
    expect(mockTaskUpdate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("updates assignee when user exists in tenant", async () => {
    mockTaskFindFirst.mockResolvedValue(baseTask);
    mockUserFindFirst.mockResolvedValue({ id: userId });
    mockTaskUpdate.mockResolvedValue({ ...baseTask, assignedToUserId: userId });

    await updateTask(tenantId, taskId, {
      assignedToUserId: userId,
    });

    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: taskId },
      data: { assignedToUserId: userId },
    });
  });

  it("clears assignee when assignedToUserId is null", async () => {
    mockTaskFindFirst.mockResolvedValue({ ...baseTask, assignedToUserId: userId });
    mockTaskUpdate.mockResolvedValue({ ...baseTask, assignedToUserId: null });

    await updateTask(tenantId, taskId, {
      assignedToUserId: null,
    });

    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: taskId },
      data: { assignedToUserId: null },
    });
  });
});

describe("deleteTask", () => {
  it("returns false when task does not exist for tenant", async () => {
    mockTaskFindFirst.mockResolvedValue(null);

    const result = await deleteTask(tenantId, "bad-id");

    expect(mockTaskDelete).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it("deletes and returns true when task exists", async () => {
    mockTaskFindFirst.mockResolvedValue(baseTask);
    mockTaskDelete.mockResolvedValue(baseTask);

    const result = await deleteTask(tenantId, taskId);

    expect(mockTaskDelete).toHaveBeenCalledWith({ where: { id: taskId } });
    expect(result).toBe(true);
  });
});
