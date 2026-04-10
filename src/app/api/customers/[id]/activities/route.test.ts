import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/[id]/activities/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
}));

vi.mock("@/modules/activities", () => ({
  listActivitiesByCustomerId: vi.fn(),
  createActivity: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById } = await import("@/modules/customers");
const { listActivitiesByCustomerId, createActivity } = await import("@/modules/activities");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockListActivitiesByCustomerId = vi.mocked(listActivitiesByCustomerId);
const mockCreateActivity = vi.mocked(createActivity);

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
 * Phase 7: GET/POST /api/customers/[id]/activities.
 * Covers: 401/403, 404 when customer not found, 200 list (empty and with data),
 * 201 create with createdById, 400 validation (POST), 400 when createActivity returns null.
 * Does not cover: real DB or full session integration.
 */
describe("GET /api/customers/[id]/activities", () => {
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
    expect(mockListActivitiesByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 200 and activities array when customer exists", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const activities = [
      {
        id: "act-1",
        tenantId: "tenant-1",
        customerId,
        type: "CALL" as const,
        subject: "Follow-up",
        body: "Discussed renewal.",
        createdAt: new Date(),
        createdById: "user-1",
        createdBy: { id: "user-1", name: "Broker", email: "broker@tenant.local" },
      },
    ];
    mockListActivitiesByCustomerId.mockResolvedValue(activities);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("act-1");
    expect(body[0].type).toBe("CALL");
    expect(body[0].subject).toBe("Follow-up");
    expect(mockListActivitiesByCustomerId).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });

  it("returns empty array when customer has no activities", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockListActivitiesByCustomerId.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/customers/[id]/activities", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "NOTE", subject: "Test" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(401);
    expect(mockCreateActivity).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "NOTE" }),
      }),
      { params: params("bad-id") }
    );

    expect(res.status).toBe(404);
    expect(mockCreateActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (invalid type)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "INVALID_TYPE" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockCreateActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when createActivity returns null", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockCreateActivity.mockResolvedValue(null);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ type: "NOTE", subject: "Test" }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Failed to create activity");
  });

  it("returns 201 and created activity with createdById when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const created = {
      id: "act-new",
      tenantId: "tenant-1",
      customerId,
      type: "CALL" as const,
      subject: "Initial call",
      body: "Left voicemail.",
      createdAt: new Date(),
      createdById: "user-1",
    };
    mockCreateActivity.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          type: "CALL",
          subject: "Initial call",
          body: "Left voicemail.",
        }),
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("act-new");
    expect(body.type).toBe("CALL");
    expect(body.subject).toBe("Initial call");
    expect(mockCreateActivity).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId,
      expect.objectContaining({
        type: "CALL",
        subject: "Initial call",
        body: "Left voicemail.",
      }),
      authUser.id
    );
  });
});
