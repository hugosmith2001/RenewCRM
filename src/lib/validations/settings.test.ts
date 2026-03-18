import { describe, it, expect } from "vitest";
import {
  changePasswordSchema,
  updateTenantSchema,
  createUserSchema,
  updateUserSchema,
} from "@/lib/validations/settings";

/**
 * Phase 2: changePasswordSchema validation.
 * Covers: required fields, minimum length, and matching confirmation.
 */
describe("changePasswordSchema", () => {
  it("accepts valid passwords when confirmation matches", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword",
      confirmNewPassword: "newpassword",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newPassword).toBe("newpassword");
    }
  });

  it("rejects when currentPassword is empty", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpassword",
      confirmNewPassword: "newpassword",
    });

    expect(result.success).toBe(false);
  });

  it("rejects when newPassword is too short", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "short",
      confirmNewPassword: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects when passwords do not match", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "newpassword",
      confirmNewPassword: "different",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmNewPassword).toBeDefined();
    }
  });
});

/**
 * Phase 4: updateTenantSchema validation.
 * Covers:
 * - accepts a valid, trimmed name
 * - rejects empty, whitespace-only, and overly long names
 * - ignores unexpected fields like slug and tenantId
 */
describe("updateTenantSchema", () => {
  it("accepts a valid tenant name", () => {
    const result = updateTenantSchema.safeParse({
      name: "Acme Brokerage",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Brokerage");
    }
  });

  it("rejects empty, whitespace-only, and overly long names", () => {
    const cases = ["", "   ", "x".repeat(151)];

    for (const badName of cases) {
      const result = updateTenantSchema.safeParse({ name: badName });
      expect(result.success).toBe(false);
    }
  });

  it("does not accept slug or tenantId as updatable fields", () => {
    const result = updateTenantSchema.safeParse({
      name: "Valid Name",
      slug: "new-slug",
      tenantId: "other-tenant",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Valid Name" });
    }
  });
});

/**
 * Phase 5A: createUserSchema validation.
 * Covers:
 * - accepts valid email, role, and optional name
 * - rejects missing/invalid email
 * - rejects invalid role values
 * - enforces name length constraints when provided
 */
describe("createUserSchema", () => {
  it("accepts a valid payload with optional name", () => {
    const result = createUserSchema.safeParse({
      email: "new.user@example.com",
      role: "ADMIN",
      name: "New User",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("new.user@example.com");
      expect(result.data.role).toBe("ADMIN");
      expect(result.data.name).toBe("New User");
    }
  });

  it("accepts a valid payload without name", () => {
    const result = createUserSchema.safeParse({
      email: "new.user@example.com",
      role: "STAFF",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBeUndefined();
    }
  });

  it("rejects missing or invalid email", () => {
    const cases = [
      { email: "", role: "ADMIN" },
      { email: "not-an-email", role: "ADMIN" },
    ];

    for (const body of cases) {
      const result = createUserSchema.safeParse(body);
      expect(result.success).toBe(false);
    }
  });

  it("rejects invalid role values", () => {
    const result = createUserSchema.safeParse({
      email: "new.user@example.com",
      role: "INVALID_ROLE" as unknown as "ADMIN",
    });

    expect(result.success).toBe(false);
  });

  it("enforces name length constraints when provided", () => {
    const tooShort = createUserSchema.safeParse({
      email: "new.user@example.com",
      role: "ADMIN",
      name: "",
    });
    const tooLong = createUserSchema.safeParse({
      email: "new.user@example.com",
      role: "ADMIN",
      name: "x".repeat(101),
    });

    expect(tooShort.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });
});

/**
 * Phase 5A: updateUserSchema validation.
 * Covers:
 * - accepts partial updates for name, role, and isActive
 * - rejects invalid role and name values
 * - ignores unexpected fields
 */
describe("updateUserSchema", () => {
  it("accepts a payload with any subset of fields", () => {
    const cases = [
      { name: "Updated Name" },
      { role: "BROKER" },
      { isActive: false },
      { name: "Updated Name", role: "ADMIN", isActive: true },
    ];

    for (const body of cases) {
      const result = updateUserSchema.safeParse(body);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid role values", () => {
    const result = updateUserSchema.safeParse({
      role: "INVALID_ROLE" as unknown as "ADMIN",
    });

    expect(result.success).toBe(false);
  });

  it("enforces name length constraints when provided", () => {
    const tooShort = updateUserSchema.safeParse({ name: "" });
    const tooLong = updateUserSchema.safeParse({ name: "x".repeat(101) });

    expect(tooShort.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });

  it("ignores unexpected extra fields", () => {
    const result = updateUserSchema.safeParse({
      name: "Updated Name",
      role: "STAFF",
      isActive: true,
      tenantId: "other-tenant",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Updated Name",
        role: "STAFF",
        isActive: true,
      });
    }
  });
});


