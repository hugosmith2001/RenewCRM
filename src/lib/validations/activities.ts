import { z } from "zod";

const activityTypeEnum = z.enum(["CALL", "MEETING", "EMAIL", "NOTE", "ADVICE"]);

const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

export const createActivitySchema = z.object({
  type: activityTypeEnum,
  subject: optionalString(500),
  body: optionalString(10000),
});

export const updateActivitySchema = z.object({
  type: activityTypeEnum.optional(),
  subject: optionalString(500),
  body: optionalString(10000),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

/** Query params for cross-customer activities list (type, date range). */
export const listActivitiesQuerySchema = z.object({
  type: activityTypeEnum.optional(),
  range: z.enum(["7d", "30d"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
