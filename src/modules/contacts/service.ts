/**
 * Contact persons service – tenant-scoped CRUD and primary flag.
 * Contacts belong to a customer; all operations enforce tenant isolation.
 */
import { prisma } from "@/lib/db";
import type { CustomerContact } from "@prisma/client";
import type { CreateContactInput, UpdateContactInput } from "@/lib/validations/contacts";

export async function listContactsByCustomerId(
  tenantId: string,
  customerId: string
): Promise<CustomerContact[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return [];

  return prisma.customerContact.findMany({
    where: { customerId, tenantId },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
}

export async function getContactById(
  tenantId: string,
  contactId: string
): Promise<CustomerContact | null> {
  return prisma.customerContact.findFirst({
    where: { id: contactId, tenantId },
  });
}

export async function createContact(
  tenantId: string,
  customerId: string,
  data: CreateContactInput
): Promise<CustomerContact | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return null;

  if (data.isPrimary) {
    await prisma.customerContact.updateMany({
      where: { customerId, tenantId },
      data: { isPrimary: false },
    });
  }

  return prisma.customerContact.create({
    data: {
      tenantId,
      customerId,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      title: data.title ?? null,
      isPrimary: data.isPrimary ?? false,
    },
  });
}

export async function updateContact(
  tenantId: string,
  contactId: string,
  data: UpdateContactInput
): Promise<CustomerContact | null> {
  const existing = await prisma.customerContact.findFirst({
    where: { id: contactId, tenantId },
  });
  if (!existing) return null;

  if (data.isPrimary === true) {
    await prisma.customerContact.updateMany({
      where: { customerId: existing.customerId, tenantId },
      data: { isPrimary: false },
    });
  }

  return prisma.customerContact.update({
    where: { id: contactId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email ?? null }),
      ...(data.phone !== undefined && { phone: data.phone ?? null }),
      ...(data.title !== undefined && { title: data.title ?? null }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    },
  });
}

export async function deleteContact(
  tenantId: string,
  contactId: string
): Promise<boolean> {
  const existing = await prisma.customerContact.findFirst({
    where: { id: contactId, tenantId },
  });
  if (!existing) return false;
  await prisma.customerContact.delete({ where: { id: contactId } });
  return true;
}

export async function setPrimaryContact(
  tenantId: string,
  contactId: string
): Promise<CustomerContact | null> {
  const contact = await prisma.customerContact.findFirst({
    where: { id: contactId, tenantId },
  });
  if (!contact) return null;

  await prisma.customerContact.updateMany({
    where: { customerId: contact.customerId, tenantId },
    data: { isPrimary: false },
  });

  return prisma.customerContact.update({
    where: { id: contactId },
    data: { isPrimary: true },
  });
}
