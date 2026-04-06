import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listDocumentsByCustomerId,
  listDocumentsByPolicyId,
  getDocumentById,
  createDocument,
  getDocumentStream,
  deleteDocument,
} from "@/modules/documents/service";

const mockCustomerFindFirst = vi.fn();
const mockPolicyFindFirst = vi.fn();
const mockDocumentFindMany = vi.fn();
const mockDocumentFindFirst = vi.fn();
const mockDocumentCreate = vi.fn();
const mockDocumentUpdate = vi.fn();
const mockDocumentFindUnique = vi.fn();
const mockDocumentDelete = vi.fn();
const mockStoragePut = vi.fn().mockResolvedValue(undefined);
const mockStorageGetStream = vi.fn();
const mockBuildStorageKey = vi.fn((t: string, d: string, f: string) => `${t}/${d}/${f}`);

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: { findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args) },
    policy: { findFirst: (...args: unknown[]) => mockPolicyFindFirst(...args) },
    document: {
      findMany: (...args: unknown[]) => mockDocumentFindMany(...args),
      findFirst: (...args: unknown[]) => mockDocumentFindFirst(...args),
      create: (...args: unknown[]) => mockDocumentCreate(...args),
      update: (...args: unknown[]) => mockDocumentUpdate(...args),
      findUnique: (...args: unknown[]) => mockDocumentFindUnique(...args),
      delete: (...args: unknown[]) => mockDocumentDelete(...args),
    },
  },
}));

const mockStorageDelete = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/storage", () => ({
  storageDelete: (...args: unknown[]) => mockStorageDelete(...args),
  buildStorageKey: (...args: unknown[]) => mockBuildStorageKey(...args),
  storagePut: (...args: unknown[]) => mockStoragePut(...args),
  storageGetStream: (...args: unknown[]) => mockStorageGetStream(...args),
}));

const mockGetCustomerById = vi.fn();
const mockGetPolicyById = vi.fn();

vi.mock("@/modules/customers", () => ({
  getCustomerById: (...args: unknown[]) => mockGetCustomerById(...args),
}));

vi.mock("@/modules/policies", () => ({
  getPolicyById: (...args: unknown[]) => mockGetPolicyById(...args),
}));

const tenantId = "tenant-1";
const customerId = "cust-1";
const documentId = "doc-1";

const baseDocument = {
  id: documentId,
  tenantId,
  customerId,
  policyId: null,
  name: "Policy PDF",
  documentType: "POLICY_DOCUMENT" as const,
  storageKey: "tenant-1/doc-1/file.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listDocumentsByCustomerId", () => {
  it("returns empty array when customer not found", async () => {
    mockCustomerFindFirst.mockResolvedValue(null);
    const result = await listDocumentsByCustomerId(tenantId, "bad-customer");
    expect(result).toEqual([]);
    expect(mockCustomerFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-customer", tenantId, deletedAt: null },
      select: { id: true },
    });
  });

  it("returns documents for customer", async () => {
    mockCustomerFindFirst.mockResolvedValue({ id: customerId });
    mockDocumentFindMany.mockResolvedValue([baseDocument]);
    const result = await listDocumentsByCustomerId(tenantId, customerId);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Policy PDF");
    expect(mockDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId, tenantId, deletedAt: null },
      })
    );
  });
});

describe("getDocumentById", () => {
  it("returns document when found", async () => {
    mockDocumentFindFirst.mockResolvedValue(baseDocument);
    const result = await getDocumentById(tenantId, documentId);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(documentId);
    expect(mockDocumentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: documentId, tenantId, deletedAt: null },
      })
    );
  });

  it("returns null when not found", async () => {
    mockDocumentFindFirst.mockResolvedValue(null);
    const result = await getDocumentById(tenantId, "bad-id");
    expect(result).toBeNull();
  });
});

describe("listDocumentsByPolicyId", () => {
  const policyId = "policy-1";

  it("returns empty array when policy not found", async () => {
    mockPolicyFindFirst.mockResolvedValue(null);
    const result = await listDocumentsByPolicyId(tenantId, "bad-policy");
    expect(result).toEqual([]);
    expect(mockPolicyFindFirst).toHaveBeenCalledWith({
      where: { id: "bad-policy", tenantId },
      select: { id: true },
    });
  });

  it("returns documents for policy", async () => {
    mockPolicyFindFirst.mockResolvedValue({ id: policyId });
    mockDocumentFindMany.mockResolvedValue([
      { ...baseDocument, policyId },
    ]);
    const result = await listDocumentsByPolicyId(tenantId, policyId);
    expect(result).toHaveLength(1);
    expect(result[0].policyId).toBe(policyId);
    expect(mockDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { policyId, tenantId, deletedAt: null },
      })
    );
  });
});

describe("createDocument", () => {
  const metadata = {
    name: "Contract 2024",
    documentType: "CONTRACT" as const,
  };
  const file = {
    buffer: Buffer.alloc(500),
    originalFilename: "contract.pdf",
    mimeType: "application/pdf",
  };
  const createdDoc = {
    ...baseDocument,
    id: "doc-new",
    name: "Contract 2024",
    documentType: "CONTRACT",
    storageKey: "tenant-1/doc-new/contract.pdf",
  };

  it("returns null when customer not found", async () => {
    mockGetCustomerById.mockResolvedValue(null);
    const result = await createDocument(
      tenantId,
      "bad-customer",
      metadata,
      file
    );
    expect(result).toBeNull();
    expect(mockDocumentCreate).not.toHaveBeenCalled();
  });

  it("returns null when policyId given but policy not found", async () => {
    mockGetCustomerById.mockResolvedValue({ id: customerId, tenantId });
    mockGetPolicyById.mockResolvedValue(null);
    const result = await createDocument(
      tenantId,
      customerId,
      { ...metadata, policyId: "policy-1" },
      file
    );
    expect(result).toBeNull();
    expect(mockDocumentCreate).not.toHaveBeenCalled();
  });

  it("returns null when policy belongs to different customer", async () => {
    mockGetCustomerById.mockResolvedValue({ id: customerId, tenantId });
    mockGetPolicyById.mockResolvedValue({
      id: "policy-1",
      customerId: "other-customer",
    });
    const result = await createDocument(
      tenantId,
      customerId,
      { ...metadata, policyId: "policy-1" },
      file
    );
    expect(result).toBeNull();
    expect(mockDocumentCreate).not.toHaveBeenCalled();
  });

  it("creates document and uploads to storage when customer exists (no policy)", async () => {
    mockGetCustomerById.mockResolvedValue({ id: customerId, tenantId });
    mockDocumentCreate.mockResolvedValue({
      id: "doc-new",
      tenantId,
      customerId,
      policyId: null,
      name: "Contract 2024",
      documentType: "CONTRACT",
      storageKey: "tenant-1/pending",
      mimeType: "application/pdf",
      sizeBytes: 500,
      createdAt: new Date(),
    });
    mockDocumentFindUnique.mockResolvedValue(createdDoc);

    const result = await createDocument(tenantId, customerId, metadata, file);

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Contract 2024");
    expect(mockDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          customerId,
          policyId: null,
          name: "Contract 2024",
          documentType: "CONTRACT",
          mimeType: "application/pdf",
          sizeBytes: 500,
        }),
      })
    );
    expect(mockBuildStorageKey).toHaveBeenCalledWith(
      tenantId,
      "doc-new",
      "contract.pdf"
    );
    expect(mockStoragePut).toHaveBeenCalledWith(
      "tenant-1/doc-new/contract.pdf",
      file.buffer
    );
    expect(mockDocumentUpdate).toHaveBeenCalledWith({
      where: { id: "doc-new" },
      data: { storageKey: "tenant-1/doc-new/contract.pdf" },
    });
  });

  it("creates document with policyId when policy belongs to customer", async () => {
    const policyId = "policy-1";
    mockGetCustomerById.mockResolvedValue({ id: customerId, tenantId });
    mockGetPolicyById.mockResolvedValue({
      id: policyId,
      customerId,
    });
    mockDocumentCreate.mockResolvedValue({
      id: "doc-new",
      tenantId,
      customerId,
      policyId,
      name: "Policy schedule",
      documentType: "POLICY_DOCUMENT",
      storageKey: "tenant-1/pending",
      mimeType: "application/pdf",
      sizeBytes: 100,
      createdAt: new Date(),
    });
    mockDocumentFindUnique.mockResolvedValue({
      ...createdDoc,
      policyId,
    });

    const result = await createDocument(
      tenantId,
      customerId,
      { name: "Policy schedule", documentType: "POLICY_DOCUMENT", policyId },
      { buffer: Buffer.alloc(100), originalFilename: "schedule.pdf", mimeType: "application/pdf" }
    );

    expect(result).not.toBeNull();
    expect(mockDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          policyId,
        }),
      })
    );
  });
});

describe("getDocumentStream", () => {
  it("returns result of storageGetStream for given key", () => {
    const stream = { _read: () => {} };
    mockStorageGetStream.mockReturnValue(stream);
    const result = getDocumentStream("tenant-1/doc-1/file.pdf");
    expect(result).toBe(stream);
    expect(mockStorageGetStream).toHaveBeenCalledWith("tenant-1/doc-1/file.pdf");
  });
});

describe("deleteDocument", () => {
  it("returns false when document not found", async () => {
    mockDocumentFindFirst.mockResolvedValue(null);
    const result = await deleteDocument(tenantId, "bad-id");
    expect(result).toBe(false);
    expect(mockDocumentUpdate).not.toHaveBeenCalled();
    expect(mockStorageDelete).not.toHaveBeenCalled();
  });

  it("soft-deletes document when found (retention purge removes blob later)", async () => {
    mockDocumentFindFirst.mockResolvedValue(baseDocument);
    mockDocumentUpdate.mockResolvedValue({ ...baseDocument, deletedAt: new Date() });
    const result = await deleteDocument(tenantId, documentId);
    expect(result).toBe(true);
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockDocumentUpdate).toHaveBeenCalledWith({
      where: { id: documentId },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
