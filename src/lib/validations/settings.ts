import { z } from "zod";
import { Role } from "@prisma/client";

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z
      .string()
      .min(8, "Confirm password is required"),
  })
  .refine(
    (data) => data.newPassword === data.confirmNewPassword,
    {
      path: ["confirmNewPassword"],
      message: "Passwords do not match",
    }
  );

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateTenantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(150, "Name must be at most 150 characters"),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: "Invalid role" }),
  }),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  role: z
    .nativeEnum(Role, {
      errorMap: () => ({ message: "Invalid role" }),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

