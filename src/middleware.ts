import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const publicPaths = ["/", "/login"];
const authApiPrefix = "/api/auth";

const { auth } = (NextAuth as any)(authConfig);

export default auth((req: any) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  if (path.startsWith(authApiPrefix)) {
    // Basic brute-force protection for Auth.js endpoints (Credentials callback, etc).
    // Generic error messaging; keyed by IP.
    if (req.method === "POST") {
      const ip = getClientIp(req);
      const rl = rateLimit({
        key: `auth:post:${ip}`,
        limit: 10,
        windowMs: 60_000,
      });
      if (!rl.ok) {
        return new Response(JSON.stringify({ error: "Too Many Requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return;
  }

  // Best-effort abuse protection for sensitive actions.
  // Note: runs at the Edge and is per-instance (documented in docs).
  if (path === "/api/me/password" && req.method === "POST") {
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: `me:password:${ip}`,
      limit: 5,
      windowMs: 10 * 60_000,
    });
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  if (path === "/api/tenant" && req.method === "PATCH") {
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: `tenant:patch:${ip}`,
      limit: 20,
      windowMs: 10 * 60_000,
    });
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  if (publicPaths.some((p) => path === p || path.startsWith(p + "/"))) {
    if (isLoggedIn && path === "/login") {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    const login = new URL("/login", nextUrl.origin);
    login.searchParams.set("callbackUrl", path);
    return Response.redirect(login);
  }

  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
