import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PATCH,
  DELETE,
} from "@/app/api/customers/[id]/insured-objects/[objectId]/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/insured-objects", () => ({
  getInsuredObjectById: vi.fn(),
  updateInsuredObject: vi.fn(),
  deleteInsuredObject: vi.fn(),
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const {
  getInsuredObjectById,
  updateInsuredObject,
  deleteInsuredObject,
} = await import("@/modules/insured-objects");

const mockRequireRole = vi.mocked(requireRole);
const mockGetInsuredObjectById = vi.mocked(getInsuredObjectById);
const mockUpdateInsuredObject = vi.mocked(updateInsuredObject);
const mockDeleteInsuredObject = vi.mocked(deleteInsuredObject);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
  role: Role.BROKER,
};

const customerId = "cust-1";
const objectId = "obj-1";
const insuredObject = {
  id: objectId,
  tenantId: "tenant-1",
  customerId,
  type: "VEHICLE",
  name: "2019 Honda Civic",
  description: "Silver" as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function params(custId: string, objId: string) {
  return Promise.resolve({ id: custId, objectId: objId });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 4: PATCH/DELETE /api/customers/[id]/insured-objects/[objectId].
 * Covers: 401/403, 404 when object not found, 400 when object belongs to
 * different customer, 200 PATCH, 204 DELETE, validation 400 on PATCH.
 * Does not cover: real DB or session.
 */
describe("PATCH /api/customers/[id]/insured-objects/[objectId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: params(customerId, objectId) }
    );

    expect(res.status).toBe(401);
    expect(mockUpdateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 404 when insured object not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue(null);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: params(customerId, "bad-object") }
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Insured object not found");
    expect(mockUpdateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 400 when object belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue({
      ...insuredObject,
      customerId: "other-customer",
    });

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: params(customerId, objectId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Insured object does not belong to this customer");
    expect(mockUpdateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue(insuredObject);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
      }),
      { params: params(customerId, objectId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockUpdateInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 200 and updated object when valid", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue(insuredObject);
    mockAssertTenantAccess.mockImplementation(() => {});
    const updated = { ...insuredObject, name: "2020 Honda Civic" };
    mockUpdateInsuredObject.mockResolvedValue(updated);

    const res = await PATCH(
      new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ name: "2020 Honda Civic" }),
      }),
      { params: params(customerId, objectId) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("2020 Honda Civic");
    expect(mockUpdateInsuredObject).toHaveBeenCalledWith(
      authUser.tenantId,
      objectId,
      { name: "2020 Honda Civic" }
    );
    expect(mockAssertTenantAccess).toHaveBeenCalledWith(authUser, "tenant-1");
  });
});

describe("DELETE /api/customers/[id]/insured-objects/[objectId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, objectId),
    });

    expect(res.status).toBe(401);
    expect(mockDeleteInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 404 when insured object not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-object"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Insured object not found");
    expect(mockDeleteInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 400 when object belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue({
      ...insuredObject,
      customerId: "other-customer",
    });

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, objectId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Insured object does not belong to this customer");
    expect(mockDeleteInsuredObject).not.toHaveBeenCalled();
  });

  it("returns 204 when object deleted", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetInsuredObjectById.mockResolvedValue(insuredObject);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeleteInsuredObject.mockResolvedValue(true);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, objectId),
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeleteInsuredObject).toHaveBeenCalledWith(
      authUser.tenantId,
      objectId
    );
  });
});
