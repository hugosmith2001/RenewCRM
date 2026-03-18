import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/settings/users/[id]/route";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const { prisma } = await import("@/lib/db");

const mockRequireRole = vi.mocked(requireRole);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockPrismaUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockPrismaUserCount = vi.mocked(prisma.user.count);
const mockPrismaUserUpdate = vi.mocked(prisma.user.update);

const adminUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  tenantId: "tenant-1",
  role: Role.ADMIN,
};

const teamUser = {
  id: "user-1",
  tenantId: "tenant-1",
  name: "Team User",
  email: "user@example.com",
  role: Role.STAFF as const,
  isActive: true,
};

function params(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/settings/users/user-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Phase 5A: PATCH /api/settings/users/[id] (Team update).
 *
 * Covers:
 *  - 401/403 when requireRole fails
 *  - 404 when target user is missing
 *  - tenant isolation via assertTenantAccess
 *  - validation 400 for bad body
 *  - successful updates of name/role/isActive, excluding passwordHash
 *  - last-admin safeguards:
 *      - cannot demote self when last active ADMIN
 *      - cannot deactivate self when last active ADMIN
 */
describe("PATCH /api/settings/users/[id]", () => {
  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await PATCH(makeRequest({ name: "X" }), { params: params("user-1") });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 403 when requireRole throws Forbidden", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden"));

    const res = await PATCH(makeRequest({ name: "X" }), { params: params("user-1") });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when target user is not found", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ name: "X" }), { params: params("missing-id") });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
    expect(mockAssertTenantAccess).not.toHaveBeenCalled();
  });

  it("returns 403 when assertTenantAccess throws (cross-tenant access)", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue({
      ...teamUser,
      tenantId: "other-tenant",
    });
    mockAssertTenantAccess.mockImplementation(() => {
      throw new Error("Forbidden");
    });

    const res = await PATCH(makeRequest({ name: "Updated" }), { params: params(teamUser.id) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue(teamUser);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await PATCH(makeRequest({ role: "INVALID_ROLE" }), { params: params(teamUser.id) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("updates another user in the same tenant when payload is valid", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue(teamUser);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserUpdate.mockResolvedValue({
      id: teamUser.id,
      name: "Updated Name",
      email: "user@example.com",
      role: Role.BROKER,
      isActive: false,
    });

    const res = await PATCH(
      makeRequest({ name: "Updated Name", role: "BROKER", isActive: false }),
      { params: params(teamUser.id) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: teamUser.id,
      name: "Updated Name",
      email: "user@example.com",
      role: Role.BROKER,
      isActive: false,
    });

    expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: teamUser.id },
      data: {
        name: "Updated Name",
        role: "BROKER",
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  });

  it("prevents demoting self when they are the last active admin", async () => {
    const selfAdmin = {
      ...adminUser,
      isActive: true,
    };
    mockRequireRole.mockResolvedValue(selfAdmin);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: selfAdmin.id,
      tenantId: selfAdmin.tenantId,
      name: selfAdmin.name,
      email: selfAdmin.email,
      role: Role.ADMIN,
      isActive: true,
    });
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserCount.mockResolvedValue(1);

    const res = await PATCH(makeRequest({ role: "STAFF" }), { params: params(selfAdmin.id) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot remove the last active admin in the tenant");
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("prevents deactivating self when they are the last active admin", async () => {
    const selfAdmin = {
      ...adminUser,
      isActive: true,
    };
    mockRequireRole.mockResolvedValue(selfAdmin);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: selfAdmin.id,
      tenantId: selfAdmin.tenantId,
      name: selfAdmin.name,
      email: selfAdmin.email,
      role: Role.ADMIN,
      isActive: true,
    });
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserCount.mockResolvedValue(1);

    const res = await PATCH(makeRequest({ isActive: false }), { params: params(selfAdmin.id) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot remove the last active admin in the tenant");
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("allows demoting or deactivating self when there are multiple active admins", async () => {
    const selfAdmin = {
      ...adminUser,
      isActive: true,
    };
    mockRequireRole.mockResolvedValue(selfAdmin);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: selfAdmin.id,
      tenantId: selfAdmin.tenantId,
      name: selfAdmin.name,
      email: selfAdmin.email,
      role: Role.ADMIN,
      isActive: true,
    });
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserCount.mockResolvedValue(2);
    mockPrismaUserUpdate.mockResolvedValue({
      id: selfAdmin.id,
      tenantId: selfAdmin.tenantId,
      name: selfAdmin.name,
      email: selfAdmin.email,
      role: Role.STAFF,
      isActive: true,
    });

    const res = await PATCH(makeRequest({ role: "STAFF" }), { params: params(selfAdmin.id) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe(Role.STAFF);
    expect(mockPrismaUserCount).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        role: Role.ADMIN,
        isActive: true,
      },
    });
    expect(mockPrismaUserUpdate).toHaveBeenCalled();
  });

  it("prevents demoting another admin when they are the last active admin", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "other-admin",
      tenantId: adminUser.tenantId,
      name: "Other Admin",
      email: "other.admin@example.com",
      role: Role.ADMIN,
      isActive: true,
    });
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserCount.mockResolvedValue(1);

    const res = await PATCH(makeRequest({ role: "STAFF" }), {
      params: params("other-admin"),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Cannot remove the last active admin in the tenant",
    );
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("prevents deactivating another admin when they are the last active admin", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "other-admin",
      tenantId: adminUser.tenantId,
      name: "Other Admin",
      email: "other.admin@example.com",
      role: Role.ADMIN,
      isActive: true,
    });
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserCount.mockResolvedValue(1);

    const res = await PATCH(makeRequest({ isActive: false }), {
      params: params("other-admin"),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "Cannot remove the last active admin in the tenant",
    );
    expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
  });

  it("allows updating another admin when there are multiple active admins", async () => {
    mockRequireRole.mockResolvedValue(adminUser);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "other-admin",
      tenantId: adminUser.tenantId,
      name: "Other Admin",
      email: "other.admin@example.com",
      role: Role.ADMIN,
      isActive: true,
    });
    mockAssertTenantAccess.mockImplementation(() => {});
    mockPrismaUserCount.mockResolvedValue(2);
    mockPrismaUserUpdate.mockResolvedValue({
      id: "other-admin",
      name: "Other Admin",
      email: "other.admin@example.com",
      role: Role.STAFF,
      isActive: true,
    });

    const res = await PATCH(makeRequest({ role: "STAFF" }), {
      params: params("other-admin"),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe(Role.STAFF);
    expect(mockPrismaUserCount).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        role: Role.ADMIN,
        isActive: true,
      },
    });
    expect(mockPrismaUserUpdate).toHaveBeenCalled();
  });
});

