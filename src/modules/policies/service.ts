/**
 * Policies service – Phase 5.
 * Policy and insurer CRUD, tenant-scoped; policies linked to customers and insured objects.
 */
import { prisma } from "@/lib/db";
import type { Insurer, Policy } from "@prisma/client";
import type {
  CreatePolicyInput,
  UpdatePolicyInput,
  ListPoliciesQuery,
} from "@/lib/validations/policies";
import type {
  CreateInsurerInput,
  UpdateInsurerInput,
} from "@/lib/validations/insurers";

// ---------------------------------------------------------------------------
// Global policy list (tenant-scoped, for Policies workspace)
// ---------------------------------------------------------------------------

export type PolicyListItem = Policy & {
  customer: { id: string; name: string };
  insurer: { id: string; name: string };
  customerOwner: { id: string; name: string | null; email: string } | null;
  firstInsuredObjectType: string | null;
};

export async function listPolicies(
  tenantId: string,
  query: ListPoliciesQuery
): Promise<{ policies: PolicyListItem[]; total: number }> {
  const { search, status, page, limit } = query;
  const skip = (page - 1) * limit;
  const term = search?.trim();

  const where: {
    tenantId: string;
    status?: (typeof query)["status"];
    OR?: Array<
      | { policyNumber: { contains: string; mode: "insensitive" } }
      | { customer: { name: { contains: string; mode: "insensitive" } } }
      | { insurer: { name: { contains: string; mode: "insensitive" } } }
    >;
  } = { tenantId };

  if (status) where.status = status;
  if (term) {
    where.OR = [
      { policyNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { insurer: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        insurer: { select: { id: true, name: true } },
        insuredObjects: {
          take: 1,
          orderBy: { insuredObjectId: "asc" },
          include: { insuredObject: { select: { type: true } } },
        },
      },
      orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.policy.count({ where }),
  ]);

  const policies: PolicyListItem[] = rows.map((p) => {
    const c = p.customer as {
      id: string;
      name: string;
      owner: { id: string; name: string | null; email: string } | null;
    };
    return {
      ...p,
      customer: { id: c.id, name: c.name },
      insurer: p.insurer,
      customerOwner: c.owner ?? null,
      firstInsuredObjectType: p.insuredObjects[0]?.insuredObject?.type ?? null,
    };
  });

  return { policies, total };
}

// ---------------------------------------------------------------------------
// Insurers
// ---------------------------------------------------------------------------

export async function listInsurers(tenantId: string): Promise<Insurer[]> {
  return prisma.insurer.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function getInsurerById(
  tenantId: string,
  insurerId: string
): Promise<Insurer | null> {
  return prisma.insurer.findFirst({
    where: { id: insurerId, tenantId },
  });
}

export async function createInsurer(
  tenantId: string,
  data: CreateInsurerInput
): Promise<Insurer> {
  return prisma.insurer.create({
    data: {
      tenantId,
      name: data.name.trim(),
    },
  });
}

export async function updateInsurer(
  tenantId: string,
  insurerId: string,
  data: UpdateInsurerInput
): Promise<Insurer | null> {
  const existing = await prisma.insurer.findFirst({
    where: { id: insurerId, tenantId },
  });
  if (!existing) return null;
  if (data.name === undefined) return existing;
  return prisma.insurer.update({
    where: { id: insurerId },
    data: { name: data.name.trim() },
  });
}

export async function deleteInsurer(
  tenantId: string,
  insurerId: string
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "in_use" }> {
  const existing = await prisma.insurer.findFirst({
    where: { id: insurerId, tenantId },
    include: { _count: { select: { policies: true } } },
  });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing._count.policies > 0) return { ok: false, reason: "in_use" };
  await prisma.insurer.delete({ where: { id: insurerId } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export type PolicyWithInsurerAndObjects = Policy & {
  insurer: { id: string; name: string };
  insuredObjects: { insuredObject: { id: string; name: string; type: string } }[];
};

export async function listPoliciesByCustomerId(
  tenantId: string,
  customerId: string
): Promise<PolicyWithInsurerAndObjects[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true },
  });
  if (!customer) return [];

  const policies = await prisma.policy.findMany({
    where: { customerId, tenantId },
    include: {
      insurer: { select: { id: true, name: true } },
      insuredObjects: {
        include: {
          insuredObject: { select: { id: true, name: true, type: true } },
        },
      },
    },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
  });
  return policies as PolicyWithInsurerAndObjects[];
}

export async function getPolicyById(
  tenantId: string,
  policyId: string
): Promise<PolicyWithInsurerAndObjects | null> {
  const policy = await prisma.policy.findFirst({
    where: { id: policyId, tenantId },
    include: {
      insurer: { select: { id: true, name: true } },
      insuredObjects: {
        include: {
          insuredObject: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });
  return policy as PolicyWithInsurerAndObjects | null;
}

export async function createPolicy(
  tenantId: string,
  customerId: string,
  data: CreatePolicyInput
): Promise<Policy | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true },
  });
  if (!customer) return null;

  const insurer = await prisma.insurer.findFirst({
    where: { id: data.insurerId, tenantId },
    select: { id: true },
  });
  if (!insurer) return null;

  let validInsuredObjectIds: string[] = [];
  const requestedIds = data.insuredObjectIds ?? [];
  if (requestedIds.length > 0) {
    const objects = await prisma.insuredObject.findMany({
      where: {
        id: { in: requestedIds },
        customerId,
        tenantId,
      },
      select: { id: true },
    });
    validInsuredObjectIds = objects.map((o) => o.id);
  }

  const policy = await prisma.policy.create({
    data: {
      tenantId,
      customerId,
      insurerId: data.insurerId,
      policyNumber: data.policyNumber.trim(),
      premium: data.premium != null ? data.premium : null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      status: data.status ?? "ACTIVE",
      insuredObjects:
        validInsuredObjectIds.length > 0
          ? {
              create: validInsuredObjectIds.map((insuredObjectId) => ({
                insuredObjectId,
              })),
            }
          : undefined,
    },
  });
  return policy;
}

export async function updatePolicy(
  tenantId: string,
  policyId: string,
  data: UpdatePolicyInput
): Promise<Policy | null> {
  const existing = await prisma.policy.findFirst({
    where: { id: policyId, tenantId },
    select: { id: true, customerId: true },
  });
  if (!existing) return null;

  if (data.insurerId != null) {
    const insurer = await prisma.insurer.findFirst({
      where: { id: data.insurerId, tenantId },
      select: { id: true },
    });
    if (!insurer) return null;
  }

  const insuredObjectIds = data.insuredObjectIds;
  const updateData: Parameters<typeof prisma.policy.update>[0]["data"] = {
    ...(data.insurerId !== undefined && { insurerId: data.insurerId }),
    ...(data.policyNumber !== undefined && {
      policyNumber: data.policyNumber.trim(),
    }),
    ...(data.premium !== undefined && { premium: data.premium }),
    ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
    ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
    ...(data.renewalDate !== undefined && {
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
    }),
    ...(data.status !== undefined && { status: data.status }),
  };

  if (insuredObjectIds !== undefined) {
    await prisma.policyInsuredObject.deleteMany({
      where: { policyId },
    });
    if (insuredObjectIds.length > 0) {
      const objects = await prisma.insuredObject.findMany({
        where: {
          id: { in: insuredObjectIds },
          customerId: existing.customerId,
          tenantId,
        },
        select: { id: true },
      });
      const validIds = objects.map((o) => o.id);
      await prisma.policyInsuredObject.createMany({
        data: validIds.map((insuredObjectId) => ({
          policyId,
          insuredObjectId,
        })),
      });
    }
  }

  return prisma.policy.update({
    where: { id: policyId },
    data: updateData,
  });
}

export async function deletePolicy(
  tenantId: string,
  policyId: string
): Promise<boolean> {
  const existing = await prisma.policy.findFirst({
    where: { id: policyId, tenantId },
  });
  if (!existing) return false;
  await prisma.policy.delete({ where: { id: policyId } });
  return true;
}
