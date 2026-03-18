import { z } from "zod";

const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().email("Invalid email").optional()
  ),
  phone: optionalString(50),
  title: optionalString(100),
  isPrimary: z.boolean().optional().default(false),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
