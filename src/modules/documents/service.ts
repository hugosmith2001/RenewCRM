/**
 * Documents service – Phase 6.
 * Document CRUD with tenant isolation; links to customer and optional policy.
 */
import path from "path";
import type { Readable } from "stream";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Document, DocumentType } from "@prisma/client";
import type { CreateDocumentMetadataInput, ListDocumentsQuery } from "@/lib/validations/documents";
import {
  buildStorageKey,
  storagePut,
  storageGetStream,
  storageDelete,
} from "@/lib/storage";
import { getCustomerById } from "@/modules/customers";
import { getPolicyById } from "@/modules/policies";
import { CACHE_REVALIDATE_SECONDS, customerDocumentsTag } from "@/lib/cache-tags";

export type DocumentWithPolicy = Document & {
  policy: { id: string; policyNumber: string } | null;
};

export type DocumentForList = Document & {
  customer: { id: string; name: string };
  policy: { id: string; policyNumber: string } | null;
};

export type ListDocumentsForTenantFilters = Pick<
  ListDocumentsQuery,
  "customerId" | "documentType" | "search"
> & {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export async function listDocumentsForTenant(
  tenantId: string,
  filters: ListDocumentsForTenantFilters = {}
): Promise<{ documents: DocumentForList[]; total: number }> {
  const {
    customerId,
    documentType,
    search,
    from,
    to,
    limit = 50,
    offset = 0,
  } = filters;

  const where: {
    tenantId: string;
    deletedAt?: null;
    customerId?: string;
    documentType?: DocumentType;
    createdAt?: { gte?: Date; lte?: Date };
    name?: { contains: string; mode: "insensitive" };
  } = { tenantId, deletedAt: null };

  if (customerId) where.customerId = customerId;
  if (documentType) where.documentType = documentType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  if (search?.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        policy: { select: { id: true, policyNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }) as Promise<DocumentForList[]>,
    prisma.document.count({ where }),
  ]);

  return { documents, total };
}

export async function listDocumentsByCustomerId(
  tenantId: string,
  customerId: string
): Promise<DocumentWithPolicy[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return [];

  return prisma.document.findMany({
    where: { customerId, tenantId, deletedAt: null },
    include: {
      policy: { select: { id: true, policyNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<DocumentWithPolicy[]>;
}

export const listDocumentsByCustomerIdCached = (
  tenantId: string,
  customerId: string
): Promise<DocumentWithPolicy[]> =>
  unstable_cache(
    () => listDocumentsByCustomerId(tenantId, customerId),
    ["documentsByCustomerId", tenantId, customerId],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: [customerDocumentsTag(tenantId, customerId)],
    }
  )();

export async function listDocumentsByPolicyId(
  tenantId: string,
  policyId: string
): Promise<Document[]> {
  const policy = await prisma.policy.findFirst({
    where: { id: policyId, tenantId },
    select: { id: true },
  });
  if (!policy) return [];

  return prisma.document.findMany({
    where: { policyId, tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentById(
  tenantId: string,
  documentId: string
): Promise<DocumentWithPolicy | null> {
  return prisma.document.findFirst({
    where: { id: documentId, tenantId, deletedAt: null },
    include: {
      policy: { select: { id: true, policyNumber: true } },
    },
  }) as Promise<DocumentWithPolicy | null>;
}

export async function createDocument(
  tenantId: string,
  customerId: string,
  metadata: CreateDocumentMetadataInput,
  file: { buffer: Buffer; originalFilename: string; mimeType: string }
): Promise<Document | null> {
  const customer = await getCustomerById(tenantId, customerId);
  if (!customer) return null;

  let policyId: string | null = metadata.policyId ?? null;
  if (policyId) {
    const policy = await getPolicyById(tenantId, policyId);
    if (!policy || policy.customerId !== customerId) return null;
  }

  const storageKeyPlaceholder = path.join(tenantId, "pending");
  const doc = await prisma.document.create({
    data: {
      tenantId,
      customerId,
      policyId,
      name: metadata.name.trim(),
      documentType: metadata.documentType as "POLICY_DOCUMENT" | "CONTRACT" | "ID_DOCUMENT" | "CORRESPONDENCE" | "OTHER",
      storageKey: storageKeyPlaceholder,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.length,
    },
  });

  const storageKey = buildStorageKey(tenantId, doc.id, file.originalFilename);
  await storagePut(storageKey, file.buffer);

  await prisma.document.update({
    where: { id: doc.id },
    data: { storageKey },
  });

  return prisma.document.findUnique({
    where: { id: doc.id },
  });
}

export async function getDocumentStream(storageKey: string): Promise<Readable> {
  return storageGetStream(storageKey);
}

export async function deleteDocument(
  tenantId: string,
  documentId: string
): Promise<boolean> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, tenantId, deletedAt: null },
  });
  if (!doc) return false;

  // Phase 4 retention: user-initiated deletes are soft deletes.
  // Blob removal is executed by the retention purge job once eligible.
  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });
  return true;
}
