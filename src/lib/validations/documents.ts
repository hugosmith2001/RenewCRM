import { z } from "zod";

export const documentTypeEnum = z.enum([
  "POLICY_DOCUMENT",
  "CONTRACT",
  "ID_DOCUMENT",
  "CORRESPONDENCE",
  "OTHER",
]);

export const createDocumentMetadataSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  documentType: documentTypeEnum.default("OTHER"),
  policyId: z.string().min(1).optional(),
});

export type CreateDocumentMetadataInput = z.infer<typeof createDocumentMetadataSchema>;

/** Query params for cross-customer documents list (customer, type, date range, search). */
const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

export const listDocumentsQuerySchema = z.object({
  customerId: z.string().cuid().optional(),
  documentType: documentTypeEnum.optional(),
  range: z.enum(["7d", "30d"]).optional(),
  search: optionalString(200),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
