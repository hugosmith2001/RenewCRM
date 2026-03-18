import { z } from "zod";

export const auditEntityTypeEnum = z.enum([
  "Customer",
  "CustomerContact",
  "InsuredObject",
  "Insurer",
  "Policy",
  "Document",
  "Activity",
  "Task",
]);

export const auditActionEnum = z.enum(["CREATE", "UPDATE", "UPLOAD", "DELETE"]);

export const listAuditQuerySchema = z.object({
  entityType: auditEntityTypeEnum.optional(),
  entityId: z.string().cuid().optional(),
  action: auditActionEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListAuditQueryInput = z.infer<typeof listAuditQuerySchema>;
