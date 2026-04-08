/**
 * Tasks service – Phase 7.
 * Task CRUD scoped by tenant and customer; due date, priority, status, assignment.
 */
import { prisma } from "@/lib/db";
import type { Task, TaskPriority, TaskStatus } from "@prisma/client";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validations/tasks";

export type TaskForWorkQueue = Task & {
  customer: { id: string; name: string };
};

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

export async function listTasksByCustomerId(
  tenantId: string,
  customerId: string
): Promise<Task[]> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return [];

  return prisma.task.findMany({
    where: { customerId, tenantId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  }) as Promise<Task[]>;
}

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
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return null;

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ?? null }),
      ...(data.priority !== undefined && { priority: data.priority as TaskPriority }),
      ...(data.status !== undefined && { status: data.status as TaskStatus }),
    },
  });
}

export async function deleteTask(
  tenantId: string,
  taskId: string
): Promise<boolean> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return false;
  await prisma.task.delete({ where: { id: taskId } });
  return true;
}
