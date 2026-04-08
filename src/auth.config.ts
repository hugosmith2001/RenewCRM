/**
 * Edge-safe Auth.js config (no Prisma, no bcrypt).
 * Used by middleware. Full config with Credentials is in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)
) {
  throw new Error(
    "AUTH_SECRET must be set to a strong value (>= 32 chars) in production."
  );
}

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [],
  pages: {
    signIn: "/login",
  },
  /**
   * Production-safe cookie defaults.
   * We explicitly set SameSite and Secure behavior to avoid relying on framework defaults.
   */
  cookies: {
    sessionToken: {
      // Auth.js will automatically apply the "__Secure-" prefix when secure cookies are enabled.
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // re-issue JWT roughly daily
  },
  callbacks: {
    jwt: ({ token }) => token,
    session: ({ session, token }) => {
      if (session.user && token && typeof token.id === "string" && typeof token.tenantId === "string") {
        session.user.id = token.id;
        session.user.tenantId = token.tenantId;
      }
      return session;
    },
  },
  // Avoid blindly trusting Host headers in production unless explicitly configured.
  // On managed platforms (e.g. Vercel) host is generally safe; self-hosters should set AUTH_TRUST_HOST=true.
  trustHost:
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL === "1" ||
    process.env.AUTH_TRUST_HOST === "true",
} satisfies NextAuthConfig;
