import { describe, it, expect } from "vitest";
import {
  createInsuredObjectSchema,
  updateInsuredObjectSchema,
} from "@/lib/validations/insured-objects";

/**
 * Phase 4: Insured object validation (Zod schemas).
 *
 * Covers:
 * - createInsuredObjectSchema: minimal (type + name), full input, all enum types,
 *   empty-string coercion for description, reject empty/missing name, name max 255,
 *   description max 2000, invalid type, null/undefined.
 * - updateInsuredObjectSchema: empty object, single/multiple partial fields,
 *   reject invalid type/name length.
 *
 * Does not cover: API routes, DB, auth. Edge cases not exercised: exact boundary
 * lengths (255, 2000), unicode in name/description.
 */
describe("createInsuredObjectSchema", () => {
  const validTypes = ["PROPERTY", "VEHICLE", "PERSON", "BUSINESS", "EQUIPMENT", "OTHER"] as const;

  it("accepts minimal valid input (type + name)", () => {
    const result = createInsuredObjectSchema.safeParse({
      type: "PROPERTY",
      name: "Main office",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("PROPERTY");
      expect(result.data.name).toBe("Main office");
      expect(result.data.description).toBeUndefined();
    }
  });

  it("accepts full valid input with description", () => {
    const input = {
      type: "VEHICLE",
      name: "2019 Honda Civic",
      description: "Silver, reg ABC123",
    };
    const result = createInsuredObjectSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("VEHICLE");
      expect(result.data.name).toBe("2019 Honda Civic");
      expect(result.data.description).toBe("Silver, reg ABC123");
    }
  });

  validTypes.forEach((type) => {
    it(`accepts type "${type}"`, () => {
      const result = createInsuredObjectSchema.safeParse({
        type,
        name: "Object name",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.type).toBe(type);
    });
  });

  it("coerces empty description to undefined", () => {
    const result = createInsuredObjectSchema.safeParse({
      type: "OTHER",
      name: "Thing",
      description: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeUndefined();
  });

  it("rejects empty name", () => {
    expect(
      createInsuredObjectSchema.safeParse({
        type: "PROPERTY",
        name: "",
      }).success
    ).toBe(false);
  });

  it("rejects missing name", () => {
    expect(
      createInsuredObjectSchema.safeParse({ type: "VEHICLE" }).success
    ).toBe(false);
    expect(
      createInsuredObjectSchema.safeParse({
        type: "PERSON",
        description: "A person",
      }).success
    ).toBe(false);
  });

  it("rejects missing type", () => {
    expect(
      createInsuredObjectSchema.safeParse({ name: "Something" }).success
    ).toBe(false);
  });

  it("rejects name longer than 255", () => {
    const result = createInsuredObjectSchema.safeParse({
      type: "EQUIPMENT",
      name: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 2000", () => {
    const result = createInsuredObjectSchema.safeParse({
      type: "PROPERTY",
      name: "Building",
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(
      createInsuredObjectSchema.safeParse({
        type: "INVALID_TYPE",
        name: "Thing",
      }).success
    ).toBe(false);
    expect(
      createInsuredObjectSchema.safeParse({
        type: "vehicle",
        name: "Car",
      }).success
    ).toBe(false);
  });

  it("rejects null/undefined body", () => {
    expect(createInsuredObjectSchema.safeParse(null).success).toBe(false);
    expect(createInsuredObjectSchema.safeParse(undefined).success).toBe(false);
  });

  it("accepts name at max length 255", () => {
    const result = createInsuredObjectSchema.safeParse({
      type: "OTHER",
      name: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("accepts description at max length 2000", () => {
    const result = createInsuredObjectSchema.safeParse({
      type: "PROPERTY",
      name: "Building",
      description: "x".repeat(2000),
    });
    expect(result.success).toBe(true);
  });
});

describe("updateInsuredObjectSchema", () => {
  it("accepts empty object (partial update)", () => {
    const result = updateInsuredObjectSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts single field update", () => {
    const result = updateInsuredObjectSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
      expect(result.data.type).toBeUndefined();
      expect(result.data.description).toBeUndefined();
    }
  });

  it("accepts multiple fields", () => {
    const result = updateInsuredObjectSchema.safeParse({
      type: "VEHICLE",
      description: "Updated description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("VEHICLE");
      expect(result.data.description).toBe("Updated description");
    }
  });

  it("rejects invalid type in partial", () => {
    expect(
      updateInsuredObjectSchema.safeParse({ type: "NOTATYPE" }).success
    ).toBe(false);
  });

  it("rejects name longer than 255 in partial", () => {
    expect(
      updateInsuredObjectSchema.safeParse({ name: "a".repeat(256) }).success
    ).toBe(false);
  });

  it("rejects empty name in partial", () => {
    expect(
      updateInsuredObjectSchema.safeParse({ name: "" }).success
    ).toBe(false);
  });
});
