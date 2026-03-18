import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const publicPaths = ["/", "/login"];
const authApiPrefix = "/api/auth";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const isLoggedIn = !!req.auth;

  if (path.startsWith(authApiPrefix)) {
    return;
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
