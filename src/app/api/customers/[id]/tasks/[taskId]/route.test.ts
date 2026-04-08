import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/customers/[id]/tasks/[taskId]/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/tasks", () => ({
  getTaskById: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getTaskById, updateTask, deleteTask } = await import("@/modules/tasks");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetTaskById = vi.mocked(getTaskById);
const mockUpdateTask = vi.mocked(updateTask);
const mockDeleteTask = vi.mocked(deleteTask);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
};

const customerId = "cust-1";
const taskId = "task-1";
const task = {
  id: taskId,
  tenantId: "tenant-1",
  customerId,
  title: "Follow up",
  description: "Call client",
  dueDate: new Date("2025-04-01"),
  priority: "HIGH" as const,
  status: "PENDING" as const,
};

function params(custId: string, tId: string) {
  return Promise.resolve({ id: custId, taskId: tId });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 7: GET/PATCH/DELETE /api/customers/[id]/tasks/[taskId].
 * Covers: 401/403, 404 when task not found, 400 when task belongs to
 * different customer, 200 GET/PATCH, 204 DELETE, validation 400 on PATCH.
 */
describe("GET /api/customers/[id]/tasks/[taskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, taskId),
    });

    expect(res.status).toBe(401);
    expect(mockGetTaskById).not.toHaveBeenCalled();
  });

  it("returns 404 when task not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-task"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Task not found");
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("returns 400 when task belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue({
      ...task,
      customerId: "other-customer",
    });

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, taskId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Task does not belong to this customer");
  });

  it("returns 200 and task when found and customer matches", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(task);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, taskId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(taskId);
    expect(body.title).toBe("Follow up");
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("PATCH /api/customers/[id]/tasks/[taskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: params(customerId, taskId) }
    );

    expect(res.status).toBe(401);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("returns 404 when task not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: params(customerId, "bad-task") }
    );

    expect(res.status).toBe(404);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("returns 400 when task belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue({
      ...task,
      customerId: "other-customer",
    });

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: params(customerId, taskId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Task does not belong to this customer");
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (empty title)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(task);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ title: "" }),
      }),
      { params: params(customerId, taskId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it("returns 200 and updated task when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(task);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = { ...task, title: "Updated title", status: "DONE" as const };
    mockUpdateTask.mockResolvedValue(updated);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated title", status: "DONE" }),
      }),
      { params: params(customerId, taskId) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Updated title");
    expect(body.status).toBe("DONE");
    expect(mockUpdateTask).toHaveBeenCalledWith(
      authUser.tenantId,
      taskId,
      expect.objectContaining({
        title: "Updated title",
        status: "DONE",
      })
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("DELETE /api/customers/[id]/tasks/[taskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, taskId),
    });

    expect(res.status).toBe(401);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it("returns 404 when task not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-task"),
    });

    expect(res.status).toBe(404);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it("returns 400 when task belongs to different customer", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue({
      ...task,
      customerId: "other-customer",
    });

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, taskId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Task does not belong to this customer");
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it("returns 204 when task deleted", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetTaskById.mockResolvedValue(task);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeleteTask.mockResolvedValue(true);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, taskId),
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeleteTask).toHaveBeenCalledWith(authUser.tenantId, taskId);
  });
});
