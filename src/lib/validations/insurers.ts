import { z } from "zod";

export const createInsurerSchema = z.object({
  name: z.string().min(1, "Insurer name is required").max(255),
});

export const updateInsurerSchema = createInsurerSchema.partial();

export type CreateInsurerInput = z.infer<typeof createInsurerSchema>;
export type UpdateInsurerInput = z.infer<typeof updateInsurerSchema>;
