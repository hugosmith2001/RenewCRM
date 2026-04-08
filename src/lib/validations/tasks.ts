import { z } from "zod";

const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
const taskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]);

const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

const optionalDate = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    if (typeof val === "string") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return val;
  },
  z.coerce.date().optional()
);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: optionalString(5000),
  dueDate: optionalDate,
  priority: taskPriorityEnum.optional().default("MEDIUM"),
  status: taskStatusEnum.optional().default("PENDING"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: optionalString(5000),
  dueDate: optionalDate.nullable(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
