import { describe, it, expect } from "vitest";
import {
  documentTypeEnum,
  createDocumentMetadataSchema,
} from "@/lib/validations/documents";

/**
 * Phase 6: Document metadata validation (Zod schemas).
 *
 * Covers:
 * - createDocumentMetadataSchema: minimal (name only), full with policyId,
 *   documentType default OTHER, all document types, reject empty name,
 *   reject name > 255, reject invalid documentType, policyId optional.
 *
 * Does not cover: API routes, storage, or file content validation.
 * Edge cases not exercised: exact boundary length 255, unicode in name,
 * policyId empty string (coerced by API before parse).
 */
describe("documentTypeEnum", () => {
  it("accepts all allowed document types", () => {
    const types = [
      "POLICY_DOCUMENT",
      "CONTRACT",
      "ID_DOCUMENT",
      "CORRESPONDENCE",
      "OTHER",
    ];
    types.forEach((t) => {
      const result = documentTypeEnum.safeParse(t);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(t);
    });
  });

  it("rejects invalid document type", () => {
    const result = documentTypeEnum.safeParse("INVALID_TYPE");
    expect(result.success).toBe(false);
  });
});

describe("createDocumentMetadataSchema", () => {
  it("accepts minimal valid input (name only)", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "Policy PDF",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Policy PDF");
      expect(result.data.documentType).toBe("OTHER");
      expect(result.data.policyId).toBeUndefined();
    }
  });

  it("accepts full valid input with policyId", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "Contract 2024",
      documentType: "CONTRACT",
      policyId: "policy-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Contract 2024");
      expect(result.data.documentType).toBe("CONTRACT");
      expect(result.data.policyId).toBe("policy-123");
    }
  });

  it("defaults documentType to OTHER when omitted", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "Some doc",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.documentType).toBe("OTHER");
  });

  it("accepts all document types", () => {
    const types = [
      "POLICY_DOCUMENT",
      "CONTRACT",
      "ID_DOCUMENT",
      "CORRESPONDENCE",
      "OTHER",
    ] as const;
    types.forEach((documentType) => {
      const result = createDocumentMetadataSchema.safeParse({
        name: "Doc",
        documentType,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.documentType).toBe(documentType);
    });
  });

  it("rejects empty name", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createDocumentMetadataSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 255 characters", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name of exactly 255 characters", () => {
    const name = "a".repeat(255);
    const result = createDocumentMetadataSchema.safeParse({ name });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe(name);
  });

  it("rejects invalid documentType", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "Doc",
      documentType: "NOT_A_TYPE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects policyId that is empty string (min(1) fails)", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "Doc",
      policyId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with leading/trailing spaces (service trims before save)", () => {
    const result = createDocumentMetadataSchema.safeParse({
      name: "  With spaces  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("  With spaces  ");
  });
});
