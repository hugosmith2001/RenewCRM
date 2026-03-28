import { describe, it, expect } from "vitest";
import {
  changePasswordSchema,
  updateTenantSchema,
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
