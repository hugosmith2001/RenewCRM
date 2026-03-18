import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/customers/[id]/activities/[activityId]/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/activities", () => ({
  getActivityById: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const { getActivityById, updateActivity, deleteActivity } = await import("@/modules/activities");

const mockRequireRole = vi.mocked(requireRole);
const mockGetActivityById = vi.mocked(getActivityById);
const mockUpdateActivity = vi.mocked(updateActivity);
const mockDeleteActivity = vi.mocked(deleteActivity);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
  role: Role.BROKER,
};

const customerId = "cust-1";
const activityId = "act-1";
const activity = {
  id: activityId,
  tenantId: "tenant-1",
  customerId,
  type: "NOTE" as const,
  subject: "Note",
  body: "Some notes.",
  createdAt: new Date(),
  createdById: "user-1",
  createdBy: { id: "user-1", name: "Broker", email: "broker@tenant.local" },
};

function params(custId: string, actId: string) {
  return Promise.resolve({ id: custId, activityId: actId });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 7: GET/PATCH/DELETE /api/customers/[id]/activities/[activityId].
 * Covers: 401/403, 404 when activity not found, 400 when activity belongs to
 * different customer, 200 GET/PATCH, 204 DELETE, validation 400 on PATCH.
 */
describe("GET /api/customers/[id]/activities/[activityId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, activityId),
    });

    expect(res.status).toBe(401);
    expect(mockGetActivityById).not.toHaveBeenCalled();
  });

  it("returns 404 when activity not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-activity"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Activity not found");
    expect(mockUpdateActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when activity belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue({
      ...activity,
      customerId: "other-customer",
    });

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, activityId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Activity does not belong to this customer");
  });

  it("returns 200 and activity when found and customer matches", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(activity);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, activityId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(activityId);
    expect(body.subject).toBe("Note");
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("PATCH /api/customers/[id]/activities/[activityId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ subject: "Updated" }),
      }),
      { params: params(customerId, activityId) }
    );

    expect(res.status).toBe(401);
    expect(mockUpdateActivity).not.toHaveBeenCalled();
  });

  it("returns 404 when activity not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ subject: "Updated" }),
      }),
      { params: params(customerId, "bad-activity") }
    );

    expect(res.status).toBe(404);
    expect(mockUpdateActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when activity belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue({
      ...activity,
      customerId: "other-customer",
    });

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ subject: "Updated" }),
      }),
      { params: params(customerId, activityId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Activity does not belong to this customer");
    expect(mockUpdateActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (invalid type)", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(activity);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ type: "INVALID" }),
      }),
      { params: params(customerId, activityId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockUpdateActivity).not.toHaveBeenCalled();
  });

  it("returns 200 and updated activity when valid", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(activity);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = { ...activity, subject: "Updated subject" };
    mockUpdateActivity.mockResolvedValue(updated);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ subject: "Updated subject" }),
      }),
      { params: params(customerId, activityId) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subject).toBe("Updated subject");
    expect(mockUpdateActivity).toHaveBeenCalledWith(
      authUser.tenantId,
      activityId,
      { subject: "Updated subject" }
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("DELETE /api/customers/[id]/activities/[activityId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, activityId),
    });

    expect(res.status).toBe(401);
    expect(mockDeleteActivity).not.toHaveBeenCalled();
  });

  it("returns 404 when activity not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-activity"),
    });

    expect(res.status).toBe(404);
    expect(mockDeleteActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when activity belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue({
      ...activity,
      customerId: "other-customer",
    });

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, activityId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Activity does not belong to this customer");
    expect(mockDeleteActivity).not.toHaveBeenCalled();
  });

  it("returns 204 when activity deleted", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetActivityById.mockResolvedValue(activity);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeleteActivity.mockResolvedValue(true);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, activityId),
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeleteActivity).toHaveBeenCalledWith(authUser.tenantId, activityId);
  });
});
