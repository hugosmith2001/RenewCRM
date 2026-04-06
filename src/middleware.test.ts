import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Make the middleware's NextAuth wrapper return the handler directly.
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: (handler: (req: NextRequest) => Response | void) => handler,
  })),
}));

function makeReq(url: string, opts: { method: string; ip?: string }) {
  const req = new NextRequest(url, {
    method: opts.method,
    headers: opts.ip ? { "x-forwarded-for": opts.ip } : undefined,
  });
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as unknown as Record<string, unknown>).__safekeep_rate_limit_buckets__ = new Map();
});

describe("middleware rate limiting", () => {
  it("rate limits POST requests to /api/auth/* by IP (11th request is 429)", async () => {
    const middleware = (await import("@/middleware")).default;
    const ip = "203.0.113.10";

    for (let i = 0; i < 10; i++) {
      const res = await middleware(
        makeReq("http://localhost/api/auth/callback/credentials", { method: "POST", ip })
      );
      expect(res).toBeUndefined();
    }

    const blocked = await middleware(
      makeReq("http://localhost/api/auth/callback/credentials", { method: "POST", ip })
    );
    expect(blocked).toBeInstanceOf(Response);
    expect(blocked!.status).toBe(429);
  });

  it("rate limits POST /api/me/password by IP (6th request is 429)", async () => {
    const middleware = (await import("@/middleware")).default;
    const ip = "203.0.113.11";

    for (let i = 0; i < 5; i++) {
      const req = makeReq("http://localhost/api/me/password", { method: "POST", ip });
      // Simulate authenticated request so middleware does not redirect to /login.
      (req as any).auth = { user: { id: "u1" } };
      const res = await middleware(
        req
      );
      expect(res).toBeUndefined();
    }

    const blockedReq = makeReq("http://localhost/api/me/password", { method: "POST", ip });
    (blockedReq as any).auth = { user: { id: "u1" } };
    const blocked = await middleware(
      blockedReq
    );
    expect(blocked).toBeInstanceOf(Response);
    expect(blocked!.status).toBe(429);
  });

  it("does not rate limit non-POST requests to /api/auth/*", async () => {
    const middleware = (await import("@/middleware")).default;
    const ip = "203.0.113.12";

    for (let i = 0; i < 50; i++) {
      const res = await middleware(
        makeReq("http://localhost/api/auth/session", { method: "GET", ip })
      );
      expect(res).toBeUndefined();
    }
  });
});

