import { z } from "zod";

export const dsarRequestTypeEnum = z.enum(["EXPORT", "ERASE", "RESTRICT"]);
export const dsarSubjectTypeEnum = z.enum(["CUSTOMER", "CONTACT", "USER"]);
export const dsarStatusEnum = z.enum([
  "PENDING",
  "IN_REVIEW",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REJECTED",
]);

export const createDsarRequestSchema = z.object({
  requestType: dsarRequestTypeEnum,
  subjectType: dsarSubjectTypeEnum,
  subjectRefId: z.string().cuid(),
  notes: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(5000).optional()
  ),
});

export const listDsarRequestsQuerySchema = z.object({
  status: dsarStatusEnum.optional(),
  requestType: dsarRequestTypeEnum.optional(),
  subjectType: dsarSubjectTypeEnum.optional(),
  subjectRefId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateDsarStatusSchema = z.object({
  status: dsarStatusEnum,
  note: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(5000).optional()
  ),
});

export type CreateDsarRequestInput = z.infer<typeof createDsarRequestSchema>;
export type ListDsarRequestsQuery = z.infer<typeof listDsarRequestsQuerySchema>;
export type UpdateDsarStatusInput = z.infer<typeof updateDsarStatusSchema>;

