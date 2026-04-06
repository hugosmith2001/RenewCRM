/**
 * Prisma client singleton.
 * Use this for all database access to avoid multiple instances in development.
 */
import { PrismaClient } from "@prisma/client";
import { assertRuntimeConfig } from "@/lib/config";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Fail fast for missing critical runtime config in server runtimes.
assertRuntimeConfig();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
