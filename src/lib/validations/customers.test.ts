import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from "@/lib/validations/customers";

/**
 * Phase 2: Customer validation (Zod schemas).
 * Covers: create/update/list query validation, required/optional fields,
 * enums, empty-string coercion, pagination defaults.
 * Does not cover: API routes, DB, or auth.
 */
describe("createCustomerSchema", () => {
  it("accepts minimal valid input (name only)", () => {
    const result = createCustomerSchema.safeParse({ name: "Acme Corp" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Corp");
      expect(result.data.type).toBe("PRIVATE");
      expect(result.data.status).toBe("ACTIVE");
      expect(result.data.email).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
      expect(result.data.address).toBeUndefined();
      expect(result.data.ownerBrokerId).toBeUndefined();
    }
  });

  it("accepts full valid input", () => {
    const input = {
      name: "Jane Doe",
      type: "PRIVATE" as const,
      email: "jane@example.com",
      phone: "+46 70 123 45 67",
      address: "Street 1, City",
      ownerBrokerId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      status: "PROSPECT" as const,
    };
    const result = createCustomerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe(input.name);
      expect(result.data.type).toBe("PRIVATE");
      expect(result.data.email).toBe("jane@example.com");
      expect(result.data.phone).toBe("+46 70 123 45 67");
      expect(result.data.address).toBe("Street 1, City");
      expect(result.data.ownerBrokerId).toBe(input.ownerBrokerId);
      expect(result.data.status).toBe("PROSPECT");
    }
  });

  it("accepts COMPANY type", () => {
    const result = createCustomerSchema.safeParse({
      name: "Acme",
      type: "COMPANY",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe("COMPANY");
  });

  it("coerces empty email to undefined", () => {
    const result = createCustomerSchema.safeParse({
      name: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeUndefined();
  });

  it("coerces empty phone and address to undefined", () => {
    const result = createCustomerSchema.safeParse({
      name: "Test",
      phone: "",
      address: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.address).toBeUndefined();
    }
  });

  it("rejects empty name", () => {
    expect(createCustomerSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(createCustomerSchema.safeParse({}).success).toBe(false);
    expect(createCustomerSchema.safeParse({ type: "PRIVATE" }).success).toBe(false);
  });

  it("rejects name longer than 255", () => {
    const result = createCustomerSchema.safeParse({
      name: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format when provided", () => {
    expect(
      createCustomerSchema.safeParse({ name: "X", email: "not-an-email" }).success
    ).toBe(false);
  });

  it("rejects invalid type enum", () => {
    expect(
      createCustomerSchema.safeParse({ name: "X", type: "INVALID" }).success
    ).toBe(false);
  });

  it("rejects invalid status enum", () => {
    expect(
      createCustomerSchema.safeParse({ name: "X", status: "PENDING" }).success
    ).toBe(false);
  });

  it("rejects null/undefined body", () => {
    expect(createCustomerSchema.safeParse(null).success).toBe(false);
    expect(createCustomerSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("updateCustomerSchema", () => {
  it("accepts empty object (partial update)", () => {
    const result = updateCustomerSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(Object.keys(result.data)).toHaveLength(0);
  });

  it("accepts single field update", () => {
    const result = updateCustomerSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
      expect(result.data.type).toBeUndefined();
    }
  });

  it("accepts multiple fields", () => {
    const result = updateCustomerSchema.safeParse({
      status: "INACTIVE",
      email: "updated@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("INACTIVE");
      expect(result.data.email).toBe("updated@example.com");
    }
  });

  it("rejects invalid type in partial", () => {
    expect(
      updateCustomerSchema.safeParse({ type: "INVALID" }).success
    ).toBe(false);
  });

  it("rejects invalid status in partial", () => {
    expect(
      updateCustomerSchema.safeParse({ status: "PENDING" }).success
    ).toBe(false);
  });
});

describe("listCustomersQuerySchema", () => {
  it("accepts empty object and applies defaults", () => {
    const result = listCustomersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.search).toBeUndefined();
      expect(result.data.status).toBeUndefined();
      expect(result.data.type).toBeUndefined();
    }
  });

  it("accepts search and filters", () => {
    const result = listCustomersQuerySchema.safeParse({
      search: "acme",
      status: "ACTIVE",
      type: "COMPANY",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("acme");
      expect(result.data.status).toBe("ACTIVE");
      expect(result.data.type).toBe("COMPANY");
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("coerces page and limit from strings", () => {
    const result = listCustomersQuerySchema.safeParse({
      page: "3",
      limit: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects page less than 1", () => {
    expect(listCustomersQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listCustomersQuerySchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it("rejects limit greater than 100", () => {
    expect(listCustomersQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false
    );
  });

  it("rejects search longer than 200", () => {
    const result = listCustomersQuerySchema.safeParse({
      search: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status in query", () => {
    expect(
      listCustomersQuerySchema.safeParse({ status: "PENDING" }).success
    ).toBe(false);
  });

  it("rejects invalid type in query", () => {
    expect(
      listCustomersQuerySchema.safeParse({ type: "GOV" }).success
    ).toBe(false);
  });
});
