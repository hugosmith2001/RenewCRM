import { describe, it, expect } from "vitest";
import { createContactSchema, updateContactSchema } from "@/lib/validations/contacts";

/**
 * Phase 3: Contact validation (Zod schemas).
 *
 * Covers:
 * - createContactSchema: minimal (name only), full input, isPrimary default/true,
 *   empty-string coercion (email, phone, title), reject empty/missing name,
 *   name/phone/title max length, invalid email, non-boolean isPrimary, null/undefined.
 * - updateContactSchema: empty object, single/multiple partial fields,
 *   reject invalid email/name length/isPrimary type.
 *
 * Does not cover: API routes, DB, auth, or schema composition with other modules.
 * Edge cases not exercised: exact boundary lengths (255, 50, 100), unicode in name.
 */
describe("createContactSchema", () => {
  it("accepts minimal valid input (name only)", () => {
    const result = createContactSchema.safeParse({ name: "Jane Doe" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane Doe");
      expect(result.data.isPrimary).toBe(false);
      expect(result.data.email).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
      expect(result.data.title).toBeUndefined();
    }
  });

  it("accepts full valid input", () => {
    const input = {
      name: "John Smith",
      email: "john@example.com",
      phone: "+46 70 111 22 33",
      title: "CFO",
      isPrimary: true,
    };
    const result = createContactSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Smith");
      expect(result.data.email).toBe("john@example.com");
      expect(result.data.phone).toBe("+46 70 111 22 33");
      expect(result.data.title).toBe("CFO");
      expect(result.data.isPrimary).toBe(true);
    }
  });

  it("defaults isPrimary to false when omitted", () => {
    const result = createContactSchema.safeParse({ name: "Test Contact" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrimary).toBe(false);
  });

  it("accepts isPrimary true", () => {
    const result = createContactSchema.safeParse({
      name: "Primary",
      isPrimary: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrimary).toBe(true);
  });

  it("coerces empty email to undefined", () => {
    const result = createContactSchema.safeParse({
      name: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeUndefined();
  });

  it("coerces empty phone and title to undefined", () => {
    const result = createContactSchema.safeParse({
      name: "Test",
      phone: "",
      title: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.title).toBeUndefined();
    }
  });

  it("rejects empty name", () => {
    expect(createContactSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(createContactSchema.safeParse({}).success).toBe(false);
    expect(
      createContactSchema.safeParse({ email: "a@b.com" }).success
    ).toBe(false);
  });

  it("rejects name longer than 255", () => {
    const result = createContactSchema.safeParse({
      name: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format when provided", () => {
    expect(
      createContactSchema.safeParse({ name: "X", email: "not-an-email" }).success
    ).toBe(false);
  });

  it("rejects phone longer than 50", () => {
    const result = createContactSchema.safeParse({
      name: "X",
      phone: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 100", () => {
    const result = createContactSchema.safeParse({
      name: "X",
      title: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean isPrimary", () => {
    expect(
      createContactSchema.safeParse({ name: "X", isPrimary: "yes" }).success
    ).toBe(false);
  });

  it("rejects null/undefined body", () => {
    expect(createContactSchema.safeParse(null).success).toBe(false);
    expect(createContactSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  it("accepts empty object (partial update)", () => {
    const result = updateContactSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts single field update", () => {
    const result = updateContactSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
      expect(result.data.email).toBeUndefined();
    }
  });

  it("accepts multiple fields including isPrimary", () => {
    const result = updateContactSchema.safeParse({
      email: "updated@example.com",
      isPrimary: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("updated@example.com");
      expect(result.data.isPrimary).toBe(true);
    }
  });

  it("rejects invalid email in partial", () => {
    expect(
      updateContactSchema.safeParse({ email: "invalid" }).success
    ).toBe(false);
  });

  it("rejects name longer than 255 in partial", () => {
    expect(
      updateContactSchema.safeParse({ name: "a".repeat(256) }).success
    ).toBe(false);
  });

  it("rejects invalid type for isPrimary", () => {
    expect(
      updateContactSchema.safeParse({ isPrimary: 1 }).success
    ).toBe(false);
  });
});
