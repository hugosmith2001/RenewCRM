import { describe, it, expect } from "vitest";
import { authConfig } from "@/auth.config";

/**
 * Phase 1: Edge-safe auth config.
 * Covers: session callback adds id, tenantId, role to session when token has them;
 *         session callback does not mutate when token is missing fields.
 * Does not cover: full NextAuth flow, JWT encoding, or middleware.
 */
describe("authConfig", () => {
  it("has signIn page set to /login", () => {
    expect(authConfig.pages?.signIn).toBe("/login");
  });

  it("uses jwt session strategy", () => {
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  describe("session callback", () => {
    const sessionCallback = authConfig.callbacks?.session;

    it("adds id, tenantId, role to session.user when token has them", () => {
      if (typeof sessionCallback !== "function") throw new Error("missing session callback");
      const session = {
        user: { email: "x@x.com", name: "X" },
        expires: "",
      };
      const token = {
        id: "user-123",
        tenantId: "tenant-456",
        role: "ADMIN",
        email: "x@x.com",
        name: "X",
      };
      const result = sessionCallback({ session, token, user: {} as never });
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe("user-123");
      expect(result.user!.tenantId).toBe("tenant-456");
      expect(result.user!.role).toBe("ADMIN");
    });

    it("returns session unchanged when token has no id", () => {
      if (typeof sessionCallback !== "function") throw new Error("missing session callback");
      const session = { user: { email: "x@x.com" }, expires: "" };
      const token = { tenantId: "t1", role: "ADMIN" };
      const result = sessionCallback({ session, token, user: {} as never });
      expect(result.user!.id).toBeUndefined();
      expect(result.user!.tenantId).toBeUndefined();
    });

    it("returns session unchanged when token has no tenantId", () => {
      if (typeof sessionCallback !== "function") throw new Error("missing session callback");
      const session = { user: { email: "x@x.com" }, expires: "" };
      const token = { id: "u1", role: "ADMIN" };
      const result = sessionCallback({ session, token, user: {} as never });
      expect(result.user!.tenantId).toBeUndefined();
    });

    it("returns session unchanged when token has no role", () => {
      if (typeof sessionCallback !== "function") throw new Error("missing session callback");
      const session = { user: { email: "x@x.com" }, expires: "" };
      const token = { id: "u1", tenantId: "t1" };
      const result = sessionCallback({ session, token, user: {} as never });
      expect(result.user!.role).toBeUndefined();
    });

    it("returns session unchanged when session.user is missing", () => {
      if (typeof sessionCallback !== "function") throw new Error("missing session callback");
      const session = { user: undefined, expires: "" };
      const token = { id: "u1", tenantId: "t1", role: "ADMIN" };
      const result = sessionCallback({ session, token, user: {} as never });
      expect(result.user).toBeUndefined();
    });
  });
});
