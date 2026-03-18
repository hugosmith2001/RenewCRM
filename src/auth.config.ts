/**
 * Edge-safe Auth.js config (no Prisma, no bcrypt).
 * Used by middleware. Full config with Credentials is in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt: ({ token }) => token,
    session: ({ session, token }) => {
      if (session.user && token && typeof token.id === "string" && typeof token.tenantId === "string" && token.role) {
        session.user.id = token.id;
        session.user.tenantId = token.tenantId;
        session.user.role = token.role as "ADMIN" | "BROKER" | "STAFF";
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
