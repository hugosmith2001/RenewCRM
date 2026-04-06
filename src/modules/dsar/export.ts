/**
 * DSAR export service – Phase 3B.
 * Generates predictable, tenant-scoped JSON exports (and CSV summaries) for access/portability.
 */
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/modules/audit";
import { transitionDsarStatus } from "@/modules/dsar/service";
import type { SessionUser } from "@/modules/auth";
import type { Prisma } from "@prisma/client";

export type DsarExportCsvBundle = Record<string, string>;

export type DsarExportResult = {
  id: string;
  tenantId: string;
  dsarRequestId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  formatVersion: 1;
  includeFiles: boolean;
  completedAt: Date | null;
  exportJson: Record<string, unknown> | null;
  exportCsv: DsarExportCsvBundle | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ExportOptions = {
  includeFiles?: boolean;
};

const FORMAT_VERSION = 1 as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[,"\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

function nowIso(): string {
  return new Date().toISOString();
}

function stableSortByCreatedAt<T extends { createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getDsarExportByRequestId(operator: SessionUser, dsarRequestId: string): Promise<DsarExportResult | null> {
  const exp = await prisma.dsarExport.findFirst({
    where: { dsarRequestId, tenantId: operator.tenantId },
  });
  return (exp as unknown as DsarExportResult | null) ?? null;
}

export async function generateDsarExportForRequest(
  operator: SessionUser,
  dsarRequestId: string,
  options: ExportOptions = {}
): Promise<DsarExportResult> {
  const includeFiles = options.includeFiles ?? false;
  if (includeFiles) {
    // Current storage model supports per-document access, but bundle generation is not yet productized.
    throw new Error("ExportFilesNotSupported");
  }

  const req = await prisma.dsarRequest.findFirst({
    where: { id: dsarRequestId, tenantId: operator.tenantId },
    select: {
      id: true,
      tenantId: true,
      requestType: true,
      subjectType: true,
      subjectRefId: true,
      status: true,
    },
  });
  if (!req) throw new Error("DsarRequestNotFound");
  if (req.requestType !== "EXPORT") throw new Error("DsarRequestNotExport");
  if (req.status !== "APPROVED") throw new Error("DsarRequestNotApproved");

  // Mark DSAR request as processing (audited).
  await transitionDsarStatus(operator, dsarRequestId, { status: "PROCESSING" });

  // Ensure an export record exists and is marked as processing.
  const processing = await prisma.dsarExport.upsert({
    where: { dsarRequestId: req.id },
    create: {
      tenantId: operator.tenantId,
      dsarRequestId: req.id,
      status: "PROCESSING",
      formatVersion: FORMAT_VERSION,
      includeFiles,
    },
    update: {
      status: "PROCESSING",
      formatVersion: FORMAT_VERSION,
      includeFiles,
      error: null,
    },
  });

  try {
    const { exportJson, exportCsv } = await buildExportPayload(operator.tenantId, req.subjectType, req.subjectRefId);

    const completed = await prisma.dsarExport.update({
      where: { id: processing.id },
      data: {
        status: "COMPLETED",
        exportJson: exportJson as Prisma.InputJsonValue,
        exportCsv: exportCsv as Prisma.InputJsonValue,
        completedAt: new Date(),
        error: null,
      },
    });

    await transitionDsarStatus(operator, dsarRequestId, { status: "COMPLETED" });

    await logAuditEvent({
      tenantId: operator.tenantId,
      userId: operator.id,
      action: "UPDATE",
      entityType: "DsarRequest",
      entityId: dsarRequestId,
      metadata: {
        dsarRequestId,
        requestType: "EXPORT",
        subjectType: req.subjectType,
        subjectId: req.subjectRefId,
        status: "COMPLETED",
        actionType: "EXPORT_GENERATED",
      },
    });

    return completed as unknown as DsarExportResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ExportFailed";
    const failed = await prisma.dsarExport.update({
      where: { id: processing.id },
      data: {
        status: "FAILED",
        error: message,
      },
    });

    // Best-effort mark DSAR request as failed (may throw if transition invalid).
    try {
      await transitionDsarStatus(operator, dsarRequestId, { status: "FAILED" });
    } catch {
      // ignore
    }

    throw new Error(message);
  }
}

async function buildExportPayload(
  tenantId: string,
  subjectType: "CUSTOMER" | "CONTACT" | "USER",
  subjectRefId: string
): Promise<{ exportJson: Record<string, unknown>; exportCsv: DsarExportCsvBundle }> {
  if (subjectType === "CUSTOMER") {
    return buildCustomerExport(tenantId, subjectRefId);
  }
  if (subjectType === "CONTACT") {
    return buildContactExport(tenantId, subjectRefId);
  }
  // USER exports can be added later; architecture supports it but needs careful scoping.
  throw new Error("UserExportNotImplemented");
}

async function buildCustomerExport(
  tenantId: string,
  customerId: string
): Promise<{ exportJson: Record<string, unknown>; exportCsv: DsarExportCsvBundle }> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      type: true,
      email: true,
      phone: true,
      address: true,
      status: true,
      ownerBrokerId: true,
      createdAt: true,
      updatedAt: true,
      contacts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          title: true,
          isPrimary: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      activities: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          subject: true,
          body: true,
          createdAt: true,
          createdById: true,
        },
      },
      tasks: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          status: true,
          assignedToUserId: true,
        },
      },
      insuredObjects: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      policies: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          policyNumber: true,
          premium: true,
          startDate: true,
          endDate: true,
          renewalDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          insurer: { select: { id: true, name: true } },
          insuredObjects: {
            select: {
              insuredObject: { select: { id: true, type: true, name: true } },
            },
          },
          documents: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              documentType: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
        },
      },
      documents: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          documentType: true,
          mimeType: true,
          sizeBytes: true,
          policyId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) throw new Error("SubjectNotFound");

  const json = {
    formatVersion: FORMAT_VERSION,
    exportType: "DSAR_ACCESS_PORTABILITY",
    exportedAt: nowIso(),
    tenantId,
    subject: { type: "CUSTOMER", id: customer.id },
    includedCategories: [
      "customer_profile",
      "linked_contacts",
      "activities",
      "tasks",
      "policies",
      "insured_objects",
      "document_metadata",
    ],
    files: { included: false, reason: "Document files are not bundled in this MVP export. Use per-document download endpoints." },
    data: {
      customer: {
        id: customer.id,
        name: customer.name,
        type: customer.type,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        status: customer.status,
        ownerBrokerId: customer.ownerBrokerId,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
      contacts: customer.contacts.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      activities: stableSortByCreatedAt(customer.activities).map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      tasks: customer.tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      })),
      insuredObjects: stableSortByCreatedAt(customer.insuredObjects).map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      policies: stableSortByCreatedAt(customer.policies).map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        premium: p.premium?.toString?.() ?? p.premium ?? null,
        startDate: p.startDate.toISOString().slice(0, 10),
        endDate: p.endDate.toISOString().slice(0, 10),
        renewalDate: p.renewalDate ? p.renewalDate.toISOString().slice(0, 10) : null,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        insurer: p.insurer,
        insuredObjects: p.insuredObjects.map((io) => io.insuredObject),
        documents: p.documents.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        })),
      })),
      documents: customer.documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    },
  } satisfies Record<string, unknown>;

  const csv: DsarExportCsvBundle = {
    "customer.csv": toCsv(
      [
        {
          id: customer.id,
          name: customer.name,
          type: customer.type,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          status: customer.status,
          ownerBrokerId: customer.ownerBrokerId,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
        },
      ],
      ["id", "name", "type", "email", "phone", "address", "status", "ownerBrokerId", "createdAt", "updatedAt"]
    ),
    "contacts.csv": toCsv(
      customer.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        title: c.title,
        isPrimary: c.isPrimary,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      ["id", "name", "email", "phone", "title", "isPrimary", "createdAt", "updatedAt"]
    ),
    "activities.csv": toCsv(
      stableSortByCreatedAt(customer.activities).map((a) => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        body: a.body,
        createdAt: a.createdAt.toISOString(),
        createdById: a.createdById,
      })),
      ["id", "type", "subject", "body", "createdAt", "createdById"]
    ),
    "tasks.csv": toCsv(
      customer.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        priority: t.priority,
        status: t.status,
        assignedToUserId: t.assignedToUserId,
      })),
      ["id", "title", "description", "dueDate", "priority", "status", "assignedToUserId"]
    ),
    "policies.csv": toCsv(
      customer.policies.map((p) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        insurerId: p.insurer.id,
        insurerName: p.insurer.name,
        premium: p.premium?.toString?.() ?? p.premium ?? null,
        startDate: p.startDate.toISOString().slice(0, 10),
        endDate: p.endDate.toISOString().slice(0, 10),
        renewalDate: p.renewalDate ? p.renewalDate.toISOString().slice(0, 10) : null,
        status: p.status,
      })),
      ["id", "policyNumber", "insurerId", "insurerName", "premium", "startDate", "endDate", "renewalDate", "status"]
    ),
    "insured_objects.csv": toCsv(
      stableSortByCreatedAt(customer.insuredObjects).map((o) => ({
        id: o.id,
        type: o.type,
        name: o.name,
        description: o.description,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      ["id", "type", "name", "description", "createdAt", "updatedAt"]
    ),
    "documents.csv": toCsv(
      customer.documents.map((d) => ({
        id: d.id,
        name: d.name,
        documentType: d.documentType,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        policyId: d.policyId,
        createdAt: d.createdAt.toISOString(),
      })),
      ["id", "name", "documentType", "mimeType", "sizeBytes", "policyId", "createdAt"]
    ),
  };

  return { exportJson: json, exportCsv: csv };
}

async function buildContactExport(
  tenantId: string,
  contactId: string
): Promise<{ exportJson: Record<string, unknown>; exportCsv: DsarExportCsvBundle }> {
  const contact = await prisma.customerContact.findFirst({
    where: { id: contactId, tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      title: true,
      isPrimary: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (!contact) throw new Error("SubjectNotFound");

  const json = {
    formatVersion: FORMAT_VERSION,
    exportType: "DSAR_ACCESS_PORTABILITY",
    exportedAt: nowIso(),
    tenantId,
    subject: { type: "CONTACT", id: contact.id },
    includedCategories: ["contact_profile", "linked_customer_reference"],
    exclusions: [
      {
        category: "customer_activities_tasks_documents_policies",
        reason:
          "Activities/tasks/documents/policies are customer-scoped in the current data model and cannot be safely attributed to a specific contact without additional linking fields.",
      },
    ],
    files: { included: false, reason: "No document files are associated directly to a contact in the current model." },
    data: {
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
      },
      customer: {
        id: contact.customer.id,
        name: contact.customer.name,
      },
    },
  } satisfies Record<string, unknown>;

  const csv: DsarExportCsvBundle = {
    "contact.csv": toCsv(
      [
        {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          title: contact.title,
          isPrimary: contact.isPrimary,
          customerId: contact.customer.id,
          customerName: contact.customer.name,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString(),
        },
      ],
      ["id", "name", "email", "phone", "title", "isPrimary", "customerId", "customerName", "createdAt", "updatedAt"]
    ),
  };

  return { exportJson: json, exportCsv: csv };
}

