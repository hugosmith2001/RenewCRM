import { describe, it, expect } from "vitest";
import {
  createPolicySchema,
  updatePolicySchema,
} from "@/lib/validations/policies";

/**
 * Phase 5: Policy validation (Zod schemas).
 *
 * Covers:
 * - createPolicySchema: required insurerId, policyNumber, startDate, endDate;
 *   optional premium (number/string coercion), renewalDate, status, insuredObjectIds;
 *   startDate <= endDate refinement; invalid dates rejected; negative premium rejected.
 * - updatePolicySchema: partial fields; same date/premium rules when provided.
 *
 * Does not cover: API routes, DB, auth. Edge cases not exercised: premium precision,
 * timezone edge cases, policyNumber exact max 100.
 */
describe("createPolicySchema", () => {
  const validCreate = {
    insurerId: "ins-1",
    policyNumber: "POL-2024-001",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  };

  it("accepts minimal valid input", () => {
    const result = createPolicySchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.insurerId).toBe("ins-1");
      expect(result.data.policyNumber).toBe("POL-2024-001");
      expect(result.data.status).toBe("ACTIVE");
      expect(result.data.insuredObjectIds).toEqual([]);
      expect(result.data.premium).toBeUndefined();
      expect(result.data.renewalDate).toBeUndefined();
    }
  });

  it("accepts full input with premium, renewalDate, status, insuredObjectIds", () => {
    const input = {
      ...validCreate,
      premium: 1500,
      renewalDate: "2024-12-01",
      status: "ACTIVE" as const,
      insuredObjectIds: ["obj-1", "obj-2"],
    };
    const result = createPolicySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.premium).toBe(1500);
      expect(result.data.renewalDate).toBe("2024-12-01");
      expect(result.data.insuredObjectIds).toEqual(["obj-1", "obj-2"]);
    }
  });

  it("coerces premium from string to number", () => {
    const result = createPolicySchema.safeParse({
      ...validCreate,
      premium: "99.50",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.premium).toBe(99.5);
  });

  it("coerces empty premium to undefined", () => {
    const result = createPolicySchema.safeParse({
      ...validCreate,
      premium: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.premium).toBeUndefined();
  });

  it("rejects negative premium", () => {
    const result = createPolicySchema.safeParse({
      ...validCreate,
      premium: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when endDate is before startDate", () => {
    const result = createPolicySchema.safeParse({
      ...validCreate,
      startDate: "2024-12-31",
      endDate: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts when startDate equals endDate", () => {
    const result = createPolicySchema.safeParse({
      ...validCreate,
      startDate: "2024-06-15",
      endDate: "2024-06-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty insurerId", () => {
    expect(
      createPolicySchema.safeParse({ ...validCreate, insurerId: "" }).success
    ).toBe(false);
  });

  it("rejects empty policyNumber", () => {
    expect(
      createPolicySchema.safeParse({ ...validCreate, policyNumber: "" }).success
    ).toBe(false);
  });

  it("rejects invalid startDate", () => {
    expect(
      createPolicySchema.safeParse({ ...validCreate, startDate: "not-a-date" })
        .success
    ).toBe(false);
  });

  it("rejects invalid endDate", () => {
    expect(
      createPolicySchema.safeParse({ ...validCreate, endDate: "invalid" })
        .success
    ).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(
      createPolicySchema.safeParse({
        ...validCreate,
        status: "INVALID_STATUS",
      }).success
    ).toBe(false);
  });

  const validStatuses = ["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"] as const;
  validStatuses.forEach((status) => {
    it(`accepts status "${status}"`, () => {
      const result = createPolicySchema.safeParse({
        ...validCreate,
        status,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe(status);
    });
  });

  it("rejects policyNumber longer than 100", () => {
    const result = createPolicySchema.safeParse({
      ...validCreate,
      policyNumber: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects null/undefined body", () => {
    expect(createPolicySchema.safeParse(null).success).toBe(false);
    expect(createPolicySchema.safeParse(undefined).success).toBe(false);
  });
});

describe("updatePolicySchema", () => {
  it("accepts empty object", () => {
    const result = updatePolicySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts partial fields", () => {
    const result = updatePolicySchema.safeParse({
      policyNumber: "POL-2024-002",
      status: "EXPIRED",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.policyNumber).toBe("POL-2024-002");
      expect(result.data.status).toBe("EXPIRED");
    }
  });

  it("rejects when provided endDate is before startDate", () => {
    const result = updatePolicySchema.safeParse({
      startDate: "2024-12-31",
      endDate: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts only startDate (no endDate) so refinement passes", () => {
    const result = updatePolicySchema.safeParse({
      startDate: "2024-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts only endDate (no startDate)", () => {
    const result = updatePolicySchema.safeParse({
      endDate: "2025-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative premium in partial", () => {
    expect(
      updatePolicySchema.safeParse({ premium: -1 }).success
    ).toBe(false);
  });

  it("accepts insuredObjectIds array", () => {
    const result = updatePolicySchema.safeParse({
      insuredObjectIds: ["obj-1"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.insuredObjectIds).toEqual(["obj-1"]);
  });
});
