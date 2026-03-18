/**
 * Customer service – tenant-scoped CRUD and list with search.
 */
import { prisma } from "@/lib/db";
import type { Customer, CustomerStatus, CustomerType } from "@prisma/client";
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from "@/lib/validations/customers";

export type CustomerWithOwner = Customer & {
  owner: { id: string; name: string | null; email: string } | null;
};

export async function getCustomerById(
  tenantId: string,
  id: string
): Promise<CustomerWithOwner | null> {
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });
  return customer as CustomerWithOwner | null;
}

export async function listCustomers(
  tenantId: string,
  query: ListCustomersQuery
): Promise<{ customers: CustomerWithOwner[]; total: number }> {
  const { search, status, type, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: {
    tenantId: string;
    status?: CustomerStatus;
    type?: CustomerType;
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }>;
  } = { tenantId };

  if (status) where.status = status;
  if (type) where.type = type;

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers: customers as CustomerWithOwner[], total };
}

export async function createCustomer(
  tenantId: string,
  data: CreateCustomerInput,
  ownerBrokerId?: string | null
): Promise<Customer> {
  return prisma.customer.create({
    data: {
      tenantId,
      name: data.name,
      type: data.type,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      ownerBrokerId: data.ownerBrokerId ?? ownerBrokerId ?? null,
      status: data.status,
    },
  });
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  data: UpdateCustomerInput
): Promise<Customer | null> {
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return null;

  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.email !== undefined && { email: data.email ?? null }),
      ...(data.phone !== undefined && { phone: data.phone ?? null }),
      ...(data.address !== undefined && { address: data.address ?? null }),
      ...(data.ownerBrokerId !== undefined && { ownerBrokerId: data.ownerBrokerId ?? null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

export async function deleteCustomer(
  tenantId: string,
  id: string
): Promise<boolean> {
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return false;
  await prisma.customer.delete({ where: { id } });
  return true;
}
