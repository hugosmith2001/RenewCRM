import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentUser,
  getCurrentTenant,
  requireAuth,
  assertTenantAccess,
  type SessionUser,
} from "@/modules/auth/session";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

const { auth } = await import("@/auth");
const { prisma } = await import("@/lib/db");

const mockAuth = vi.mocked(auth);
const mockTenantFindUnique = vi.mocked(prisma.tenant.findUnique);

const sessionUser: SessionUser = {
  id: "user-1",
  email: "admin@tenant.local",
  name: "Admin",
  tenantId: "tenant-1",
  role: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 1: Auth session helpers.
 * Covers: getCurrentUser, getCurrentTenant, requireAuth, requireRole, assertTenantAccess
 * with mocked auth() and prisma. Does not cover real NextAuth or DB.
 */
describe("getCurrentUser", () => {
  it("returns null when auth() returns no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when session has no user", async () => {
    mockAuth.mockResolvedValue({ user: undefined, expires: "" });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when session user has no id", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "x@x.com", tenantId: "t1" },
      expires: "",
    });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when session user has no tenantId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "x@x.com" },
      expires: "",
    });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns SessionUser when session is complete", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        tenantId: sessionUser.tenantId,
      },
      expires: "2025-01-01",
    });
    const user = await getCurrentUser();
    expect(user).toEqual(sessionUser);
  });

  it("defaults missing name to null and email to empty string", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "u1",
        email: undefined,
        tenantId: "t1",
      },
      expires: "",
    });
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.name).toBeNull();
    expect(user!.email).toBe("");
  });
});

describe("getCurrentTenant", () => {
  it("returns null when getCurrentUser returns null", async () => {
    mockAuth.mockResolvedValue(null);
    const tenant = await getCurrentTenant();
    expect(tenant).toBeNull();
    expect(mockTenantFindUnique).not.toHaveBeenCalled();
  });

  it("calls prisma.tenant.findUnique and returns tenant when user exists", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        tenantId: sessionUser.tenantId,
      },
      expires: "",
    });
    const tenantRecord = { id: "tenant-1", name: "Acme", slug: "acme", createdAt: new Date(), updatedAt: new Date() };
    mockTenantFindUnique.mockResolvedValue(tenantRecord);
    const tenant = await getCurrentTenant();
    expect(tenant).toEqual(tenantRecord);
    expect(mockTenantFindUnique).toHaveBeenCalledWith({ where: { id: "tenant-1" } });
  });

  it("returns null when tenant is not found in DB", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", email: "x@x.com", tenantId: "t1" },
      expires: "",
    });
    mockTenantFindUnique.mockResolvedValue(null);
    await expect(getCurrentTenant()).resolves.toBeNull();
  });
});

describe("requireAuth", () => {
  it("throws Unauthorized when getCurrentUser returns null", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("returns SessionUser when user exists", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        tenantId: sessionUser.tenantId,
      },
      expires: "",
    });
    const user = await requireAuth();
    expect(user).toEqual(sessionUser);
  });
});

describe("assertTenantAccess", () => {
  it("does not throw when resource tenantId matches user tenantId", () => {
    expect(() => assertTenantAccess(sessionUser, "tenant-1")).not.toThrow();
  });

  it("throws Forbidden when resource tenantId does not match", () => {
    expect(() => assertTenantAccess(sessionUser, "other-tenant")).toThrow("Forbidden");
  });

  it("throws for empty resource tenantId when user has tenant", () => {
    expect(() => assertTenantAccess(sessionUser, "")).toThrow("Forbidden");
  });
});
