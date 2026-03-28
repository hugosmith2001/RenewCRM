/**
 * Renewals module – policies with renewal dates, bucketed for broker work queue.
 * Reuses Policy + customer/insurer/owner/insuredObject from policies service.
 */
import { prisma } from "@/lib/db";
import type { PolicyStatus, Prisma } from "@prisma/client";

export type RenewalItem = {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  renewalDate: Date | null;
  customerId: string;
  customerName: string;
  insurerName: string;
  productType: string | null;
  brokerName: string | null;
  brokerEmail: string | null;
};

export type RenewalsBuckets = {
  overdue: RenewalItem[];
  next7: RenewalItem[];
  next30: RenewalItem[];
  next90: RenewalItem[];
  later: RenewalItem[];
  missingDate: RenewalItem[];
};

export type RenewalsQuery = {
  brokerId?: string;
  status?: PolicyStatus;
};

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function toRenewalItem(row: {
  id: string;
  policyNumber: string;
  status: PolicyStatus;
  renewalDate: Date | null;
  customer: { id: string; name: string; owner: { name: string | null; email: string } | null };
  insurer: { name: string };
  insuredObjects: { insuredObject: { type: string } }[];
}): RenewalItem {
  return {
    id: row.id,
    policyNumber: row.policyNumber,
    status: row.status,
    renewalDate: row.renewalDate,
    customerId: row.customer.id,
    customerName: row.customer.name,
    insurerName: row.insurer.name,
    productType: row.insuredObjects[0]?.insuredObject?.type ?? null,
    brokerName: row.customer.owner?.name ?? null,
    brokerEmail: row.customer.owner?.email ?? null,
  };
}

export async function listRenewalsBucketed(
  tenantId: string,
  query: RenewalsQuery = {}
): Promise<RenewalsBuckets> {
  const today = startOfDay(new Date());
  const day7 = new Date(today);
  day7.setUTCDate(day7.getUTCDate() + 7);
  const day30 = new Date(today);
  day30.setUTCDate(day30.getUTCDate() + 30);
  const day90 = new Date(today);
  day90.setUTCDate(day90.getUTCDate() + 90);

  const where: Prisma.PolicyWhereInput = { tenantId };
  if (query.status) where.status = query.status;
  if (query.brokerId !== undefined && query.brokerId !== "") {
    where.customer = { ownerBrokerId: query.brokerId };
  }

  const rows = await prisma.policy.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          owner: { select: { name: true, email: true } },
        },
      },
      insurer: { select: { name: true } },
      insuredObjects: {
        take: 1,
        orderBy: { insuredObjectId: "asc" },
        include: { insuredObject: { select: { type: true } } },
      },
    },
    orderBy: [{ renewalDate: "asc" }, { endDate: "desc" }],
  });

  const overdue: RenewalItem[] = [];
  const next7: RenewalItem[] = [];
  const next30: RenewalItem[] = [];
  const next90: RenewalItem[] = [];
  const later: RenewalItem[] = [];
  const missingDate: RenewalItem[] = [];

  for (const row of rows) {
    const item = toRenewalItem({
      id: row.id,
      policyNumber: row.policyNumber,
      status: row.status,
      renewalDate: row.renewalDate,
      customer: row.customer,
      insurer: row.insurer,
      insuredObjects: row.insuredObjects,
    });
    if (row.renewalDate == null) {
      missingDate.push(item);
      continue;
    }
    const rd = row.renewalDate;
    const renewalStart = startOfDay(rd);
    if (renewalStart < today) overdue.push(item);
    else if (renewalStart <= day7) next7.push(item);
    else if (renewalStart <= day30) next30.push(item);
    else if (renewalStart <= day90) next90.push(item);
    else later.push(item);
  }

  return { overdue, next7, next30, next90, later, missingDate };
}
