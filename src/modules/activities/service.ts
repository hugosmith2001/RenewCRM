/**
 * Activities service – Phase 7.
 * Activity CRUD scoped by tenant and customer (calls, meetings, notes, etc.).
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Activity, ActivityType } from "@prisma/client";
import type { CreateActivityInput, UpdateActivityInput } from "@/lib/validations/activities";
import { CACHE_REVALIDATE_SECONDS, customerActivitiesTag } from "@/lib/cache-tags";

export type ActivityWithCreator = Activity & {
  createdBy: { id: string; name: string | null; email: string } | null;
};

export type ActivityForFeed = ActivityWithCreator & {
  customer: { id: string; name: string };
};

export type ListActivitiesForTenantFilters = {
  type?: ActivityType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export async function listActivitiesForTenant(
  tenantId: string,
  filters: ListActivitiesForTenantFilters = {}
): Promise<{ activities: ActivityForFeed[]; total: number }> {
  const { type, from, to, limit = 100, offset = 0 } = filters;
  const where = {
    tenantId,
    ...(type && { type }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }) as Promise<ActivityForFeed[]>,
    prisma.activity.count({ where }),
  ]);

  return { activities, total };
}

export async function listActivitiesByCustomerId(
  tenantId: string,
  customerId: string
): Promise<ActivityWithCreator[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return [];

  return prisma.activity.findMany({
    where: { customerId, tenantId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<ActivityWithCreator[]>;
}

export const listActivitiesByCustomerIdCached = (
  tenantId: string,
  customerId: string
): Promise<ActivityWithCreator[]> =>
  unstable_cache(
    () => listActivitiesByCustomerId(tenantId, customerId),
    ["activitiesByCustomerId", tenantId, customerId],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: [customerActivitiesTag(tenantId, customerId)],
    }
  )();

export async function getActivityById(
  tenantId: string,
  activityId: string
): Promise<ActivityWithCreator | null> {
  return prisma.activity.findFirst({
    where: { id: activityId, tenantId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  }) as Promise<ActivityWithCreator | null>;
}

export async function createActivity(
  tenantId: string,
  customerId: string,
  data: CreateActivityInput,
  createdById?: string | null
): Promise<Activity | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return null;

  return prisma.activity.create({
    data: {
      tenantId,
      customerId,
      type: data.type as ActivityType,
      subject: data.subject ?? null,
      body: data.body ?? null,
      createdById: createdById ?? null,
    },
  });
}

export async function updateActivity(
  tenantId: string,
  activityId: string,
  data: UpdateActivityInput
): Promise<Activity | null> {
  const existing = await prisma.activity.findFirst({
    where: { id: activityId, tenantId },
  });
  if (!existing) return null;

  return prisma.activity.update({
    where: { id: activityId },
    data: {
      ...(data.type !== undefined && { type: data.type as ActivityType }),
      ...(data.subject !== undefined && { subject: data.subject ?? null }),
      ...(data.body !== undefined && { body: data.body ?? null }),
    },
  });
}

export async function deleteActivity(
  tenantId: string,
  activityId: string
): Promise<boolean> {
  const existing = await prisma.activity.findFirst({
    where: { id: activityId, tenantId },
  });
  if (!existing) return false;
  await prisma.activity.delete({ where: { id: activityId } });
  return true;
}
