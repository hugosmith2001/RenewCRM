import { describe, it, expect } from "vitest";
import {
  listAuditQuerySchema,
  auditEntityTypeEnum,
  auditActionEnum,
} from "@/lib/validations/audit";

/**
 * Phase 8: Audit list query validation.
 * Covers: valid empty query (defaults), valid entityType/action/entityId,
 * invalid entityType/action, pagination bounds, invalid entityId (non-cuid).
 * Does not cover: API route, DB, or audit service.
 */
describe("listAuditQuerySchema", () => {
  it("accepts empty object and applies default page and limit", () => {
    const result = listAuditQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.entityType).toBeUndefined();
      expect(result.data.entityId).toBeUndefined();
      expect(result.data.action).toBeUndefined();
    }
  });

  it("accepts valid entityType values", () => {
    const types = [
      "Customer",
      "CustomerContact",
      "InsuredObject",
      "Insurer",
      "Policy",
      "Document",
      "Activity",
      "Task",
    ] as const;
    for (const entityType of types) {
      const result = listAuditQuerySchema.safeParse({ entityType });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.entityType).toBe(entityType);
    }
  });

  it("rejects invalid entityType", () => {
    const result = listAuditQuerySchema.safeParse({ entityType: "Invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts valid action values", () => {
    const actions = ["CREATE", "UPDATE", "UPLOAD", "DELETE"] as const;
    for (const action of actions) {
      const result = listAuditQuerySchema.safeParse({ action });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.action).toBe(action);
    }
  });

  it("rejects invalid action", () => {
    const result = listAuditQuerySchema.safeParse({ action: "PATCH" });
    expect(result.success).toBe(false);
  });

  it("accepts valid CUID for entityId", () => {
    const cuid = "clxxxxxxxxxxxxxxxxxxxxxxxxx";
    const result = listAuditQuerySchema.safeParse({ entityId: cuid });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.entityId).toBe(cuid);
  });

  it("rejects non-CUID entityId", () => {
    expect(listAuditQuerySchema.safeParse({ entityId: "short" }).success).toBe(false);
    expect(listAuditQuerySchema.safeParse({ entityId: "uuid-like-but-not-cuid" }).success).toBe(
      false
    );
  });

  it("coerces page and limit from strings", () => {
    const result = listAuditQuerySchema.safeParse({
      page: "2",
      limit: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it("rejects page less than 1", () => {
    expect(listAuditQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listAuditQuerySchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it("rejects limit greater than 100", () => {
    expect(listAuditQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("accepts limit at boundary 100", () => {
    const result = listAuditQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(100);
  });

  it("accepts full valid query", () => {
    const result = listAuditQuerySchema.safeParse({
      entityType: "Customer",
      entityId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      action: "CREATE",
      page: 3,
      limit: 20,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe("Customer");
      expect(result.data.entityId).toBe("clxxxxxxxxxxxxxxxxxxxxxxxxx");
      expect(result.data.action).toBe("CREATE");
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(20);
    }
  });
});

describe("auditEntityTypeEnum", () => {
  it("accepts all allowed entity types", () => {
    const valid = ["Customer", "Document", "Task"];
    valid.forEach((v) => {
      expect(auditEntityTypeEnum.safeParse(v).success).toBe(true);
    });
  });

  it("rejects unknown type", () => {
    expect(auditEntityTypeEnum.safeParse("Tenant").success).toBe(false);
  });
});

describe("auditActionEnum", () => {
  it("accepts all allowed actions", () => {
    ["CREATE", "UPDATE", "UPLOAD", "DELETE"].forEach((v) => {
      expect(auditActionEnum.safeParse(v).success).toBe(true);
    });
  });

  it("rejects unknown action", () => {
    expect(auditActionEnum.safeParse("READ").success).toBe(false);
  });
});
