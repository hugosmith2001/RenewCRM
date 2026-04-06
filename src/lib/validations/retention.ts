import { z } from "zod";

export const retentionCategorySchema = z.enum([
  "INACTIVE_CUSTOMER",
  "DOCUMENT_POST_POLICY_END",
  "AUDIT_EVENT",
]);

export const setRetentionOverrideSchema = z.object({
  category: retentionCategorySchema,
  retentionDays: z.coerce.number().int().positive(),
});

