import { describe, it, expect } from "vitest";
import { createActivitySchema, updateActivitySchema } from "@/lib/validations/activities";

/**
 * Phase 7: Activity validation (Zod schemas).
 *
 * Covers:
 * - createActivitySchema: valid types (CALL, MEETING, EMAIL, NOTE, ADVICE),
 *   optional subject/body, empty-string coercion, subject/body max length,
 *   reject invalid type, missing type.
 * - updateActivitySchema: empty object (partial), single/multiple partial fields,
 *   reject invalid type.
 *
 * Does not cover: API routes, DB, or schema composition with other modules.
 * Edge cases not exercised: exact boundary lengths (500, 10000), unicode in subject/body.
 */
const VALID_TYPES = ["CALL", "MEETING", "EMAIL", "NOTE", "ADVICE"] as const;

describe("createActivitySchema", () => {
  it("accepts each valid activity type", () => {
    for (const type of VALID_TYPES) {
      const result = createActivitySchema.safeParse({ type });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.type).toBe(type);
    }
  });

  it("accepts type with optional subject and body", () => {
    const result = createActivitySchema.safeParse({
      type: "NOTE",
      subject: "Meeting notes",
      body: "Discussed renewal options.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("NOTE");
      expect(result.data.subject).toBe("Meeting notes");
      expect(result.data.body).toBe("Discussed renewal options.");
    }
  });

  it("coerces empty subject and body to undefined", () => {
    const result = createActivitySchema.safeParse({
      type: "CALL",
      subject: "",
      body: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBeUndefined();
      expect(result.data.body).toBeUndefined();
    }
  });

  it("rejects invalid type", () => {
    expect(
      createActivitySchema.safeParse({ type: "INVALID" }).success
    ).toBe(false);
    expect(
      createActivitySchema.safeParse({ type: "call" }).success
    ).toBe(false);
    expect(
      createActivitySchema.safeParse({ type: "" }).success
    ).toBe(false);
  });

  it("rejects missing type", () => {
    expect(createActivitySchema.safeParse({}).success).toBe(false);
    expect(
      createActivitySchema.safeParse({ subject: "Only subject" }).success
    ).toBe(false);
  });

  it("rejects subject longer than 500", () => {
    const result = createActivitySchema.safeParse({
      type: "NOTE",
      subject: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects body longer than 10000", () => {
    const result = createActivitySchema.safeParse({
      type: "NOTE",
      body: "a".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts subject at max length 500", () => {
    const result = createActivitySchema.safeParse({
      type: "NOTE",
      subject: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects null/undefined body", () => {
    expect(createActivitySchema.safeParse(null).success).toBe(false);
    expect(createActivitySchema.safeParse(undefined).success).toBe(false);
  });
});

describe("updateActivitySchema", () => {
  it("accepts empty object (partial update)", () => {
    const result = updateActivitySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts single field update", () => {
    const result = updateActivitySchema.safeParse({ subject: "Updated" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Updated");
      expect(result.data.type).toBeUndefined();
    }
  });

  it("accepts type and body update", () => {
    const result = updateActivitySchema.safeParse({
      type: "MEETING",
      body: "New body",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("MEETING");
      expect(result.data.body).toBe("New body");
    }
  });

  it("rejects invalid type in partial", () => {
    expect(
      updateActivitySchema.safeParse({ type: "INVALID" }).success
    ).toBe(false);
  });

  it("rejects subject longer than 500 in partial", () => {
    expect(
      updateActivitySchema.safeParse({ subject: "a".repeat(501) }).success
    ).toBe(false);
  });
});
