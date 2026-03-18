import { describe, it, expect } from "vitest";
import {
  createInsurerSchema,
  updateInsurerSchema,
} from "@/lib/validations/insurers";

/**
 * Phase 5: Insurer validation (Zod schemas).
 *
 * Covers:
 * - createInsurerSchema: valid name, empty/missing name rejected, max length 255,
 *   null/undefined body rejected.
 * - updateInsurerSchema: empty object, partial name.
 *
 * Does not cover: API routes, DB, auth. Edge cases not exercised: unicode,
 * exact boundary 255.
 */
describe("createInsurerSchema", () => {
  it("accepts valid name", () => {
    const result = createInsurerSchema.safeParse({ name: "If Skadeforsikring" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("If Skadeforsikring");
    }
  });

  it("rejects empty name", () => {
    expect(
      createInsurerSchema.safeParse({ name: "" }).success
    ).toBe(false);
  });

  it("rejects missing name", () => {
    expect(createInsurerSchema.safeParse({}).success).toBe(false);
    expect(createInsurerSchema.safeParse(null).success).toBe(false);
    expect(createInsurerSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects name longer than 255", () => {
    const result = createInsurerSchema.safeParse({
      name: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name at max length 255", () => {
    const result = createInsurerSchema.safeParse({
      name: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });
});

describe("updateInsurerSchema", () => {
  it("accepts empty object (partial update)", () => {
    const result = updateInsurerSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts partial name", () => {
    const result = updateInsurerSchema.safeParse({ name: "New Insurer Name" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("New Insurer Name");
  });

  it("rejects empty name in partial", () => {
    expect(updateInsurerSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
