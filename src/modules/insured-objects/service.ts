/**
 * Insured objects service – tenant-scoped CRUD.
 * Objects belong to a customer; all operations enforce tenant isolation.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { InsuredObject } from "@prisma/client";
import type {
  CreateInsuredObjectInput,
  UpdateInsuredObjectInput,
} from "@/lib/validations/insured-objects";
import { CACHE_REVALIDATE_SECONDS, customerInsuredObjectsTag } from "@/lib/cache-tags";

export async function listInsuredObjectsByCustomerId(
  tenantId: string,
  customerId: string
): Promise<InsuredObject[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return [];

  return prisma.insuredObject.findMany({
    where: { customerId, tenantId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export const listInsuredObjectsByCustomerIdCached = (
  tenantId: string,
  customerId: string
): Promise<InsuredObject[]> =>
  unstable_cache(
    () => listInsuredObjectsByCustomerId(tenantId, customerId),
    ["insuredObjectsByCustomerId", tenantId, customerId],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: [customerInsuredObjectsTag(tenantId, customerId)],
    }
  )();

export async function getInsuredObjectById(
  tenantId: string,
  objectId: string
): Promise<InsuredObject | null> {
  return prisma.insuredObject.findFirst({
    where: { id: objectId, tenantId },
  });
}

export async function createInsuredObject(
  tenantId: string,
  customerId: string,
  data: CreateInsuredObjectInput
): Promise<InsuredObject | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return null;

  return prisma.insuredObject.create({
    data: {
      tenantId,
      customerId,
      type: data.type,
      name: data.name,
      description: data.description ?? null,
    },
  });
}

export async function updateInsuredObject(
  tenantId: string,
  objectId: string,
  data: UpdateInsuredObjectInput
): Promise<InsuredObject | null> {
  const existing = await prisma.insuredObject.findFirst({
    where: { id: objectId, tenantId },
  });
  if (!existing) return null;

  return prisma.insuredObject.update({
    where: { id: objectId },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description ?? null }),
    },
  });
}

export async function deleteInsuredObject(
  tenantId: string,
  objectId: string
): Promise<boolean> {
  const existing = await prisma.insuredObject.findFirst({
    where: { id: objectId, tenantId },
  });
  if (!existing) return false;
  await prisma.insuredObject.delete({ where: { id: objectId } });
  return true;
}
