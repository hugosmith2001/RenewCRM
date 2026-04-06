import { describe, it, expect, vi, beforeEach } from "vitest";
import { executePurgeForTenant } from "@/modules/retention/service";

const mockTenantFindMany = vi.fn();
const mockRetentionFindUnique = vi.fn();
const mockDocumentFindMany = vi.fn();
const mockDocumentDelete = vi.fn();
const mockCustomerFindMany = vi.fn();
const mockCustomerDelete = vi.fn();
const mockAuditDeleteMany = vi.fn();
const mockActivityAgg = vi.fn();
const mockDocAgg = vi.fn();
const mockPolicyAgg = vi.fn();
const mockCustomerFindFirst = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockStorageDelete = vi.fn();
vi.mock("@/lib/storage", () => ({
  storageDelete: (...args: unknown[]) => mockStorageDelete(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: { findMany: (...args: unknown[]) => mockTenantFindMany(...args) },
    retentionPolicyOverride: {
      findUnique: (...args: unknown[]) => mockRetentionFindUnique(...args),
      upsert: vi.fn(),
    },
    document: {
      findMany: (...args: unknown[]) => mockDocumentFindMany(...args),
      delete: (...args: unknown[]) => mockDocumentDelete(...args),
      aggregate: (...args: unknown[]) => mockDocAgg(...args),
    },
    customer: {
      findMany: (...args: unknown[]) => mockCustomerFindMany(...args),
      delete: (...args: unknown[]) => mockCustomerDelete(...args),
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    activity: { aggregate: (...args: unknown[]) => mockActivityAgg(...args) },
    policy: { aggregate: (...args: unknown[]) => mockPolicyAgg(...args) },
    auditEvent: { deleteMany: (...args: unknown[]) => mockAuditDeleteMany(...args) },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRetentionFindUnique.mockResolvedValue(null); // system defaults
});

describe("executePurgeForTenant", () => {
  it("purges an eligible document by deleting blob then DB row", async () => {
    const tenantId = "t1";
    const now = new Date("2030-01-01T00:00:00.000Z");
    const oldDeletedAt = new Date("2020-01-01T00:00:00.000Z");

    mockDocumentFindMany.mockResolvedValue([
      {
        id: "d1",
        deletedAt: oldDeletedAt,
        storageKey: "t1/d1/file.pdf",
        policy: { endDate: null },
      },
    ]);
    mockStorageDelete.mockResolvedValue(undefined);
    mockDocumentDelete.mockResolvedValue(undefined);

    mockCustomerFindMany.mockResolvedValue([]);
    mockAuditDeleteMany.mockResolvedValue({ count: 0 });

    const res = await executePurgeForTenant({ tenantId, asOf: now, documentLimit: 10, customerLimit: 0 });

    expect(mockStorageDelete).toHaveBeenCalledWith("t1/d1/file.pdf");
    expect(mockDocumentDelete).toHaveBeenCalledWith({ where: { id: "d1" } });
    expect(res.deleted).toBe(1);
    expect(res.failed).toBe(0);
  });

  it("blocks customer purge when legal hold is set", async () => {
    const tenantId = "t1";
    const now = new Date("2030-01-01T00:00:00.000Z");
    const old = new Date("2010-01-01T00:00:00.000Z");

    mockDocumentFindMany.mockResolvedValue([]);
    mockCustomerFindMany.mockResolvedValue([
      { id: "c1", deletedAt: old, legalHold: true, restrictedAt: null },
    ]);
    mockAuditDeleteMany.mockResolvedValue({ count: 0 });

    const res = await executePurgeForTenant({ tenantId, asOf: now, documentLimit: 0, customerLimit: 10 });
    expect(mockCustomerDelete).not.toHaveBeenCalled();
    expect(res.blocked).toBeGreaterThanOrEqual(1);
  });

  it("does not delete a customer if a document storage delete fails", async () => {
    const tenantId = "t1";
    const now = new Date("2030-01-01T00:00:00.000Z");
    const old = new Date("2010-01-01T00:00:00.000Z");

    mockDocumentFindMany.mockResolvedValue([]); // global doc purge pass
    mockCustomerFindMany.mockResolvedValue([
      { id: "c1", deletedAt: old, legalHold: false, restrictedAt: null },
    ]);
    // anchor resolution:
    mockCustomerFindFirst.mockResolvedValue({ updatedAt: old });
    mockActivityAgg.mockResolvedValue({ _max: { createdAt: null } });
    mockDocAgg.mockResolvedValue({ _max: { createdAt: null } });
    mockPolicyAgg.mockResolvedValue({ _max: { updatedAt: null } });

    // customer document deletion safety pass:
    mockDocumentFindMany
      .mockResolvedValueOnce([]) // initial docs purge call
      .mockResolvedValueOnce([{ id: "d1", storageKey: "t1/d1/file.pdf", legalHold: false }]); // docsForCustomer

    mockStorageDelete.mockRejectedValue(new Error("boom"));
    mockAuditDeleteMany.mockResolvedValue({ count: 0 });

    const res = await executePurgeForTenant({ tenantId, asOf: now, documentLimit: 0, customerLimit: 10 });
    expect(mockCustomerDelete).not.toHaveBeenCalled();
    expect(res.failed).toBeGreaterThanOrEqual(1);
  });
});

