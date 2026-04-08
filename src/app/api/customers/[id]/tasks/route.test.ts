import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/[id]/tasks/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
}));

vi.mock("@/modules/tasks", () => ({
  listTasksByCustomerId: vi.fn(),
  createTask: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById } = await import("@/modules/customers");
const { listTasksByCustomerId, createTask } = await import("@/modules/tasks");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockListTasksByCustomerId = vi.mocked(listTasksByCustomerId);
const mockCreateTask = vi.mocked(createTask);

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
 * Phase 7: GET/POST /api/customers/[id]/tasks.
 * Covers: 401/403, 404 when customer not found, 200 list (empty and with data),
 * 201 create, 400 validation (POST), 400 when createTask returns null.
 */
describe("GET /api/customers/[id]/tasks", () => {
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
    expect(mockListTasksByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 200 and tasks array when customer exists", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const tasks = [
      {
        id: "task-1",
        tenantId: "tenant-1",
        customerId,
        title: "Follow up",
        description: "Call back",
        dueDate: new Date("2025-04-01"),
        priority: "HIGH" as const,
        status: "PENDING" as const,
      },
    ];
    mockListTasksByCustomerId.mockResolvedValue(tasks);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("task-1");
    expect(body[0].title).toBe("Follow up");
    expect(body[0].priority).toBe("HIGH");
    expect(mockListTasksByCustomerId).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });

  it("returns empty array when customer has no tasks", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockListTasksByCustomerId.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/customers/[id]/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "New task" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(401);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "New task" }),
      }),
      { params: params("bad-id") }
    );

    expect(res.status).toBe(404);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (empty title)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("returns 400 when createTask returns null", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockCreateTask.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ title: "New task" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Failed to create task");
  });

  it("returns 201 and created task when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const created = {
      id: "task-new",
      tenantId: "tenant-1",
      customerId,
      title: "New task",
      description: null,
      dueDate: new Date("2025-04-15"),
      priority: "MEDIUM" as const,
      status: "PENDING" as const,
    };
    mockCreateTask.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          title: "New task",
          dueDate: "2025-04-15",
          priority: "MEDIUM",
          status: "PENDING",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("task-new");
    expect(body.title).toBe("New task");
    expect(mockCreateTask).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId,
      expect.objectContaining({
        title: "New task",
        priority: "MEDIUM",
        status: "PENDING",
      })
    );
  });
});
