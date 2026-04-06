import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserFindUnique = vi.fn();

// Capture NextAuth options so we can test the JWT callback behavior.
vi.mock("next-auth", () => ({
  default: vi.fn((opts: unknown) => {
    (globalThis as any).__captured_nextauth_opts__ = opts;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    };
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((cfg: unknown) => cfg),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findFirst: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__captured_nextauth_opts__ = undefined;
  vi.resetModules();
});

describe("auth JWT callback (session invalidation)", () => {
  it("returns {} when user is inactive", async () => {
    await import("@/auth");
    const opts = (globalThis as any).__captured_nextauth_opts__;
    if (!opts?.callbacks?.jwt) throw new Error("Missing jwt callback");

    mockUserFindUnique.mockResolvedValue({
      isActive: false,
      tenantId: "t1",
      role: "ADMIN",
      sessionVersion: 1,
    });

    const out = await opts.callbacks.jwt({
      token: { id: "u1", sessionVersion: 1 },
      user: undefined,
      account: undefined,
      profile: undefined,
      trigger: "update",
      session: undefined,
    });

    expect(out).toEqual({});
  });

  it("returns {} when sessionVersion changed (password change invalidation)", async () => {
    await import("@/auth");
    const opts = (globalThis as any).__captured_nextauth_opts__;
    if (!opts?.callbacks?.jwt) throw new Error("Missing jwt callback");

    mockUserFindUnique.mockResolvedValue({
      isActive: true,
      tenantId: "t1",
      role: "ADMIN",
      sessionVersion: 2,
    });

    const out = await opts.callbacks.jwt({
      token: { id: "u1", tenantId: "t1", role: "ADMIN", sessionVersion: 1 },
      user: undefined,
      account: undefined,
      profile: undefined,
      trigger: "update",
      session: undefined,
    });

    expect(out).toEqual({});
  });

  it("refreshes tenantId/role/sessionVersion from DB when still valid", async () => {
    await import("@/auth");
    const opts = (globalThis as any).__captured_nextauth_opts__;
    if (!opts?.callbacks?.jwt) throw new Error("Missing jwt callback");

    mockUserFindUnique.mockResolvedValue({
      isActive: true,
      tenantId: "t-new",
      role: "BROKER",
      sessionVersion: 7,
    });

    const out = await opts.callbacks.jwt({
      token: { id: "u1", tenantId: "t-old", role: "ADMIN", sessionVersion: 7 },
      user: undefined,
      account: undefined,
      profile: undefined,
      trigger: "update",
      session: undefined,
    });

    expect(out).toMatchObject({
      id: "u1",
      tenantId: "t-new",
      role: "BROKER",
      sessionVersion: 7,
    });
  });
});

