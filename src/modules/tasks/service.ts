/**
 * Tasks service – Phase 7.
 * Task CRUD scoped by tenant and customer; due date, priority, status, assignment.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Task, TaskPriority, TaskStatus } from "@prisma/client";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/tasks";
import { CACHE_REVALIDATE_SECONDS, customerTasksTag } from "@/lib/cache-tags";

export type TaskForWorkQueue = Task & {
  customer: { id: string; name: string };
};

function startOfDayUtc(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export async function listTasksForTenant(tenantId: string): Promise<TaskForWorkQueue[]> {
  const tasks = await prisma.task.findMany({
    where: { tenantId },
    include: {
      customer: { select: { id: true, name: true } },
    },
    orderBy: [
      // Open first (PENDING, IN_PROGRESS), then DONE, CANCELLED last
      { status: "asc" },
      { dueDate: "asc" },
    ],
  });
  return tasks as TaskForWorkQueue[];
}

export async function listTasksDueTodayForTenant(
  tenantId: string,
  opts: { limit?: number } = {}
): Promise<TaskForWorkQueue[]> {
  const { limit = 10 } = opts;
  const today = startOfDayUtc(new Date());

  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      dueDate: today,
      status: { notIn: ["DONE", "CANCELLED"] },
    },
    include: {
      customer: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { title: "asc" }],
    take: limit,
  });

  return tasks as TaskForWorkQueue[];
}

export async function listTasksByCustomerId(
  tenantId: string,
  customerId: string
): Promise<Task[]> {
  return prisma.task.findMany({
    // Filter via relation instead of an extra "customer exists" round-trip.
    where: { customerId, tenantId, customer: { deletedAt: null } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  }) as Promise<Task[]>;
}

export const listTasksByCustomerIdCached = (
  tenantId: string,
  customerId: string
): Promise<Task[]> =>
  unstable_cache(
    () => listTasksByCustomerId(tenantId, customerId),
    ["tasksByCustomerId", tenantId, customerId],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
      tags: [customerTasksTag(tenantId, customerId)],
    }
  )();

export async function getTaskById(
  tenantId: string,
  taskId: string
): Promise<Task | null> {
  return prisma.task.findFirst({
    where: { id: taskId, tenantId },
  }) as Promise<Task | null>;
}

export async function createTask(
  tenantId: string,
  customerId: string,
  data: CreateTaskInput
): Promise<Task | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return null;

  return prisma.task.create({
    data: {
      tenantId,
      customerId,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      priority: (data.priority as TaskPriority) ?? "MEDIUM",
      status: (data.status as TaskStatus) ?? "PENDING",
    },
  });
}

export async function updateTask(
  tenantId: string,
  taskId: string,
  data: UpdateTaskInput
): Promise<Task | null> {
  const update = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description ?? null }),
    ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? null }),
    ...(data.priority !== undefined && { priority: data.priority as TaskPriority }),
    ...(data.status !== undefined && { status: data.status as TaskStatus }),
  };

  // Avoid a separate existence check query; keep tenant scoping in the write.
  const { count } = await prisma.task.updateMany({
    where: { id: taskId, tenantId },
    data: update,
  });
  if (count === 0) return null;

  return prisma.task.findFirst({
    where: { id: taskId, tenantId },
  }) as Promise<Task | null>;
}

export async function deleteTask(
  tenantId: string,
  taskId: string
): Promise<boolean> {
  // Single write query scoped by tenant.
  const { count } = await prisma.task.deleteMany({
    where: { id: taskId, tenantId },
  });
  return count > 0;
}
