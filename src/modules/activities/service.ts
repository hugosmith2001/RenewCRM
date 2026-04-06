/**
 * Activities service – Phase 7.
 * Activity CRUD scoped by tenant and customer (calls, meetings, notes, etc.).
 */
import { prisma } from "@/lib/db";
import type { Activity, ActivityType, Role } from "@prisma/client";
import type { CreateActivityInput, UpdateActivityInput } from "@/lib/validations/activities";

export type ActivityWithCreator = Activity & {
  createdBy: { id: string; name: string | null; email: string } | null;
};

export type ActivityForFeed = ActivityWithCreator & {
  customer: { id: string; name: string };
};

export type ListActivitiesForTenantFilters = {
  type?: ActivityType;
  createdById?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  viewerRole?: Role;
};

export async function listActivitiesForTenant(
  tenantId: string,
  filters: ListActivitiesForTenantFilters = {}
): Promise<{ activities: ActivityForFeed[]; total: number }> {
  const { type, createdById, from, to, limit = 100, offset = 0, viewerRole } = filters;
  const where = {
    tenantId,
    ...(type && { type }),
    ...(createdById && { createdById }),
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

  // Phase 2 (GDPR): Reduce broad exposure of free-text in tenant-wide feeds for STAFF.
  // Staff can still view activity content in the customer workspace where it's typically necessary.
  const safeActivities =
    viewerRole === "STAFF"
      ? activities.map((a) => ({ ...a, subject: null }))
      : activities;

  return { activities: safeActivities, total };
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
