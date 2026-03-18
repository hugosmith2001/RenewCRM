import { z } from "zod";

const insuredObjectTypeEnum = z.enum([
  "PROPERTY",
  "VEHICLE",
  "PERSON",
  "BUSINESS",
  "EQUIPMENT",
  "OTHER",
]);

const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

export const createInsuredObjectSchema = z.object({
  type: insuredObjectTypeEnum,
  name: z.string().min(1, "Name is required").max(255),
  description: optionalString(2000),
});

export const updateInsuredObjectSchema = createInsuredObjectSchema.partial();

export type CreateInsuredObjectInput = z.infer<typeof createInsuredObjectSchema>;
export type UpdateInsuredObjectInput = z.infer<typeof updateInsuredObjectSchema>;
