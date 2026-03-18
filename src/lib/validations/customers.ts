import { z } from "zod";

export const customerTypeEnum = z.enum(["PRIVATE", "COMPANY"]);
export const customerStatusEnum = z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]);

const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: customerTypeEnum.default("PRIVATE"),
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email").optional()
  ),
  phone: optionalString(50),
  address: optionalString(500),
  ownerBrokerId: z.string().cuid().optional().nullable(),
  status: customerStatusEnum.default("ACTIVE"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: customerStatusEnum.optional(),
  type: customerTypeEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
