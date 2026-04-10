import type { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { signInSchema } from "@/lib/validations/auth";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = (NextAuth as any)({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        const { email, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: { email: email.toLowerCase() },
          include: { tenant: true },
        });
        if (!user || !user.tenant) {
          return null;
        }
        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }
        if (user.isActive !== true) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          sessionVersion: user.sessionVersion,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }: any) => {
      // On sign-in, populate the minimal JWT payload.
      if (user) {
        token.id = user.id as string;
        token.tenantId = (user as { tenantId: string }).tenantId;
        token.sessionVersion = (user as { sessionVersion: number }).sessionVersion;
        token.role = (user as { role: UserRole }).role;
        return token;
      }

      // On subsequent requests, validate that the user is still active and that
      // the sessionVersion hasn't changed (e.g. password change invalidation).
      if (typeof token.id === "string") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            isActive: true,
            tenantId: true,
            sessionVersion: true,
            role: true,
          },
        });

        if (!dbUser || dbUser.isActive !== true) {
          return {};
        }
        if (typeof token.sessionVersion === "number" && dbUser.sessionVersion !== token.sessionVersion) {
          return {};
        }

        // Keep tenant authoritative from DB to avoid stale session.
        token.tenantId = dbUser.tenantId;
        token.sessionVersion = dbUser.sessionVersion;
        token.role = dbUser.role;
      }

      return token;
    },
  },
});
