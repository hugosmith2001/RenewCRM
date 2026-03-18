import { z } from "zod";

const policyStatusEnum = z.enum([
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
  "PENDING",
]);

const optionalString = (maxLen: number) =>
  z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().max(maxLen).optional()
  );

const dateString = z
  .string()
  .min(1, "Date is required")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

const optionalDateString = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), "Invalid date")
);

const optionalPremium = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  },
  z.number().nonnegative("Premium must be non-negative").optional()
);

export const createPolicySchema = z.object({
  insurerId: z.string().min(1, "Insurer is required"),
  policyNumber: z.string().min(1, "Policy number is required").max(100),
  premium: optionalPremium,
  startDate: dateString,
  endDate: dateString,
  renewalDate: optionalDateString,
  status: policyStatusEnum.default("ACTIVE"),
  insuredObjectIds: z.array(z.string()).default([]),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: "End date must be on or after start date", path: ["endDate"] }
);

export const updatePolicySchema = z
  .object({
    insurerId: z.string().min(1).optional(),
    policyNumber: z.string().min(1).max(100).optional(),
    premium: optionalPremium,
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    renewalDate: optionalDateString,
    status: policyStatusEnum.optional(),
    insuredObjectIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export const listPoliciesQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: policyStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>;
