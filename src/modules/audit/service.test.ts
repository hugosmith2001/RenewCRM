import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAuditEvent, listAuditEvents } from "@/modules/audit/service";

const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    auditEvent: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

const tenantId = "tenant-1";
const userId = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 8: Audit service.
 * Covers: logAuditEvent writes correct data and does not throw on DB failure;
 * listAuditEvents tenant isolation, filters (entityType, entityId, action), pagination.
 * Does not cover: real DB, API routes, or that routes actually call logAuditEvent.
 */
describe("logAuditEvent", () => {
  it("calls prisma.auditEvent.create with tenantId, userId, action, entityType, entityId", async () => {
    mockCreate.mockResolvedValue({});

    await logAuditEvent({
      tenantId,
      userId,
      action: "CREATE",
      entityType: "Customer",
      entityId: "cust-1",
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId,
        userId,
        action: "CREATE",
        entityType: "Customer",
        entityId: "cust-1",
        metadata: undefined,
      },
    });
  });

  it("passes metadata when provided", async () => {
    mockCreate.mockResolvedValue({});

    await logAuditEvent({
      tenantId,
      userId,
      action: "UPDATE",
      entityType: "Policy",
      entityId: "pol-1",
      metadata: { customerId: "cust-1", status: "ACTIVE" },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { customerId: "cust-1", status: "ACTIVE" },
      }),
    });
  });

  it("sanitizes metadata to IDs/enums only (drops PII/free-text-ish keys and non-primitives)", async () => {
    mockCreate.mockResolvedValue({});

    await logAuditEvent({
      tenantId,
      userId,
      action: "UPDATE",
      entityType: "Customer",
      entityId: "cust-1",
      metadata: {
        customerId: "cust-1",
        status: "INACTIVE",
        email: "person@example.com",
        name: "Person",
        notes: "free text should not be stored",
        extra: "not allowed key",
        nested: { any: "object values are dropped" },
        ok: true,
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { customerId: "cust-1", status: "INACTIVE" },
      }),
    });
  });

  it("does not throw when prisma.auditEvent.create throws (swallows and logs)", async () => {
    mockCreate.mockRejectedValue(new Error("DB connection failed"));

    await expect(logAuditEvent({
      tenantId,
      userId,
      action: "CREATE",
      entityType: "Customer",
      entityId: "cust-1",
    })).resolves.toBeUndefined();
  });

  it("supports all action types", async () => {
    mockCreate.mockResolvedValue({});

    for (const action of ["CREATE", "UPDATE", "UPLOAD", "DELETE"] as const) {
      mockCreate.mockClear();
      await logAuditEvent({
        tenantId,
        userId,
        action,
        entityType: "Document",
        entityId: "doc-1",
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action }),
        })
      );
    }
  });
});

describe("listAuditEvents", () => {
  it("returns events and total with default pagination (page 1, limit 50)", async () => {
    const events = [
      {
        id: "ev-1",
        tenantId,
        userId: "u1",
        action: "CREATE" as const,
        entityType: "Customer",
        entityId: "c1",
        metadata: {},
        createdAt: new Date(),
      },
    ];
    mockFindMany.mockResolvedValue(events);
    mockCount.mockResolvedValue(1);

    const result = await listAuditEvents(tenantId);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 50,
    });
    expect(mockCount).toHaveBeenCalledWith({ where: { tenantId } });
    expect(result.events).toEqual(events);
    expect(result.total).toBe(1);
  });

  it("filters by entityType when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listAuditEvents(tenantId, { entityType: "Policy" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, entityType: "Policy" },
      })
    );
    expect(mockCount).toHaveBeenCalledWith({ where: { tenantId, entityType: "Policy" } });
  });

  it("filters by entityId when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listAuditEvents(tenantId, { entityId: "cust-123" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, entityId: "cust-123" },
      })
    );
  });

  it("filters by action when provided", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listAuditEvents(tenantId, { action: "UPLOAD" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, action: "UPLOAD" },
      })
    );
  });

  it("applies custom page and limit", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(100);

    await listAuditEvents(tenantId, { page: 3, limit: 10 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
    expect(mockCount).toHaveBeenCalledWith({ where: { tenantId } });
  });

  it("enforces tenant isolation (only queries for given tenantId)", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listAuditEvents("other-tenant");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "other-tenant" },
      })
    );
  });

  it("combines multiple filters", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await listAuditEvents(tenantId, {
      entityType: "Document",
      entityId: "doc-1",
      action: "UPLOAD",
      page: 2,
      limit: 5,
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { tenantId, entityType: "Document", entityId: "doc-1", action: "UPLOAD" },
      orderBy: { createdAt: "desc" },
      skip: 5,
      take: 5,
    });
  });
});
