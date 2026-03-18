import { describe, it, expect } from "vitest";
import { signInSchema } from "@/lib/validations/auth";

/**
 * Phase 1: Sign-in validation (Zod schema).
 * Covers: valid input, required fields, email format.
 * Does not cover: auth.ts authorize(), rate limiting, or DB.
 */
describe("signInSchema", () => {
  it("accepts valid email and non-empty password", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.password).toBe("secret123");
    }
  });

  it("accepts email with subdomain and plus addressing", () => {
    expect(signInSchema.safeParse({ email: "a+b@sub.example.co.uk", password: "x" }).success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = signInSchema.safeParse({ email: "", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = signInSchema.safeParse({ password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(signInSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "@example.com", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "user@", password: "x" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = signInSchema.safeParse({ email: "u@e.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = signInSchema.safeParse({ email: "u@e.com" });
    expect(result.success).toBe(false);
  });

  it("rejects non-string email", () => {
    const result = signInSchema.safeParse({ email: 123, password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects null/undefined credentials", () => {
    expect(signInSchema.safeParse(null).success).toBe(false);
    expect(signInSchema.safeParse(undefined).success).toBe(false);
  });
});
