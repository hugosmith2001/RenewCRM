import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDsarExportForRequest, getDsarExportByRequestId } from "@/modules/dsar/export";

const mockDsarRequestFindFirst = vi.fn();
const mockDsarExportUpsert = vi.fn();
const mockDsarExportUpdate = vi.fn();
const mockDsarExportFindFirst = vi.fn();
const mockCustomerFindFirst = vi.fn();
const mockContactFindFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dsarRequest: {
      findFirst: (...args: unknown[]) => mockDsarRequestFindFirst(...args),
    },
    dsarExport: {
      upsert: (...args: unknown[]) => mockDsarExportUpsert(...args),
      update: (...args: unknown[]) => mockDsarExportUpdate(...args),
      findFirst: (...args: unknown[]) => mockDsarExportFindFirst(...args),
    },
    customer: {
      findFirst: (...args: unknown[]) => mockCustomerFindFirst(...args),
    },
    customerContact: {
      findFirst: (...args: unknown[]) => mockContactFindFirst(...args),
    },
  },
}));

const mockTransition = vi.fn();
vi.mock("@/modules/dsar/service", () => ({
  transitionDsarStatus: (...args: unknown[]) => mockTransition(...args),
}));

vi.mock("@/modules/audit", () => ({
  logAuditEvent: vi.fn(),
}));

const operator = {
  id: "user-1",
  email: "admin@tenant.local",
  name: "Admin",
  tenantId: "tenant-1",
  role: "ADMIN",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDsarExportByRequestId", () => {
  it("enforces tenant scoping in query", async () => {
    mockDsarExportFindFirst.mockResolvedValue(null);
    await getDsarExportByRequestId(operator as never, "dsar-1");
    expect(mockDsarExportFindFirst).toHaveBeenCalledWith({
      where: { dsarRequestId: "dsar-1", tenantId: "tenant-1" },
    });
  });
});

describe("generateDsarExportForRequest", () => {
  it("rejects when DSAR request is not approved", async () => {
    mockDsarRequestFindFirst.mockResolvedValue({
      id: "dsar-1",
      tenantId: "tenant-1",
      requestType: "EXPORT",
      subjectType: "CUSTOMER",
      subjectRefId: "cust-1",
      status: "PENDING",
    });

    await expect(generateDsarExportForRequest(operator as never, "dsar-1")).rejects.toThrow("DsarRequestNotApproved");
  });

  it("builds a stable customer export structure and includes CSV bundles", async () => {
    mockDsarRequestFindFirst.mockResolvedValue({
      id: "dsar-1",
      tenantId: "tenant-1",
      requestType: "EXPORT",
      subjectType: "CUSTOMER",
      subjectRefId: "cust-1",
      status: "APPROVED",
    });

    mockDsarExportUpsert.mockResolvedValue({
      id: "exp-1",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-1",
      status: "PROCESSING",
      formatVersion: 1,
      includeFiles: false,
      exportJson: null,
      exportCsv: null,
      error: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockCustomerFindFirst.mockResolvedValue({
      id: "cust-1",
      tenantId: "tenant-1",
      name: "Acme",
      type: "COMPANY",
      email: "acme@example.com",
      phone: "123",
      address: "Somewhere",
      status: "ACTIVE",
      ownerBrokerId: "broker-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      contacts: [
        {
          id: "con-1",
          name: "Alice",
          email: "alice@example.com",
          phone: null,
          title: "CFO",
          isPrimary: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ],
      activities: [
        {
          id: "act-1",
          type: "NOTE",
          subject: "hello",
          body: "free text",
          createdAt: new Date("2026-01-03T00:00:00.000Z"),
          createdById: "user-1",
        },
      ],
      tasks: [
        {
          id: "tsk-1",
          title: "Call",
          description: "desc",
          dueDate: new Date("2026-02-01T00:00:00.000Z"),
          priority: "HIGH",
          status: "PENDING",
          assignedToUserId: "user-2",
        },
      ],
      insuredObjects: [
        {
          id: "obj-1",
          type: "PROPERTY",
          name: "HQ",
          description: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      ],
      policies: [
        {
          id: "pol-1",
          policyNumber: "PN-1",
          premium: { toString: () => "10.00" },
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-12-31T00:00:00.000Z"),
          renewalDate: null,
          status: "ACTIVE",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          insurer: { id: "ins-1", name: "Insurer" },
          insuredObjects: [{ insuredObject: { id: "obj-1", type: "PROPERTY", name: "HQ" } }],
          documents: [
            {
              id: "doc-2",
              name: "Policy.pdf",
              documentType: "POLICY_DOCUMENT",
              mimeType: "application/pdf",
              sizeBytes: 100,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ],
        },
      ],
      documents: [
        {
          id: "doc-1",
          name: "ID.pdf",
          documentType: "ID_DOCUMENT",
          mimeType: "application/pdf",
          sizeBytes: 123,
          policyId: null,
          createdAt: new Date("2026-01-04T00:00:00.000Z"),
        },
      ],
    });

    mockDsarExportUpdate.mockImplementation(async ({ data }: any) => ({
      id: "exp-1",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-1",
      status: data.status,
      formatVersion: 1,
      includeFiles: false,
      exportJson: data.exportJson ?? null,
      exportCsv: data.exportCsv ?? null,
      error: data.error ?? null,
      completedAt: data.completedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const exp = await generateDsarExportForRequest(operator as never, "dsar-1");
    expect(mockTransition).toHaveBeenCalledWith(operator, "dsar-1", { status: "PROCESSING" });
    expect(mockTransition).toHaveBeenCalledWith(operator, "dsar-1", { status: "COMPLETED" });
    expect(exp.status).toBe("COMPLETED");
    expect(exp.exportJson).toBeTruthy();
    expect((exp.exportJson as any).formatVersion).toBe(1);
    expect((exp.exportJson as any).subject.type).toBe("CUSTOMER");
    expect(exp.exportCsv).toBeTruthy();
    expect(Object.keys(exp.exportCsv as any)).toContain("customer.csv");
    expect(Object.keys(exp.exportCsv as any)).toContain("documents.csv");
  });

  it("enforces tenant isolation when loading subject records", async () => {
    mockDsarRequestFindFirst.mockResolvedValue({
      id: "dsar-2",
      tenantId: "tenant-1",
      requestType: "EXPORT",
      subjectType: "CONTACT",
      subjectRefId: "contact-1",
      status: "APPROVED",
    });

    mockDsarExportUpsert.mockResolvedValue({
      id: "exp-2",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-2",
      status: "PROCESSING",
      formatVersion: 1,
      includeFiles: false,
      exportJson: null,
      exportCsv: null,
      error: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockContactFindFirst.mockResolvedValue({
      id: "contact-1",
      name: "Alice",
      email: "a@example.com",
      phone: null,
      title: null,
      isPrimary: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      customer: { id: "cust-1", name: "Acme" },
    });

    mockDsarExportUpdate.mockImplementation(async ({ data }: any) => ({
      id: "exp-2",
      tenantId: "tenant-1",
      dsarRequestId: "dsar-2",
      status: data.status,
      formatVersion: 1,
      includeFiles: false,
      exportJson: data.exportJson ?? null,
      exportCsv: data.exportCsv ?? null,
      error: data.error ?? null,
      completedAt: data.completedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await generateDsarExportForRequest(operator as never, "dsar-2");
    expect(mockContactFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contact-1", tenantId: "tenant-1" },
      })
    );
  });
});

