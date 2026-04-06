/**
 * Lightweight in-memory rate limiting.
 *
 * Limitations:
 * - Works per runtime instance (not distributed across multiple servers/regions).
 * - In edge/serverless environments, memory may be evicted between requests.
 *
 * This is intentional for Phase 1: cheap protection against basic abuse
 * without adding infra dependencies.
 */
import type { NextRequest } from "next/server";

type RateLimitResult =
  | { ok: true; remaining: number; resetAtMs: number }
  | { ok: false; remaining: 0; resetAtMs: number };

type Bucket = { count: number; resetAtMs: number };

const GLOBAL_KEY = "__safekeep_rate_limit_buckets__";

function buckets(): Map<string, Bucket> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map<string, Bucket>();
  return g[GLOBAL_KEY] as Map<string, Bucket>;
}

export function getClientIp(request: NextRequest): string {
  // Prefer proxy-provided headers. Avoid `request.ip` (not typed/available in all runtimes).
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim() || "unknown";
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim() || "unknown";
  return "unknown";
}

export function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = params.nowMs ?? Date.now();
  const store = buckets();
  const existing = store.get(params.key);

  if (!existing || existing.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + params.windowMs;
    store.set(params.key, { count: 1, resetAtMs });
    return { ok: true, remaining: Math.max(0, params.limit - 1), resetAtMs };
  }

  if (existing.count >= params.limit) {
    return { ok: false, remaining: 0, resetAtMs: existing.resetAtMs };
  }

  existing.count += 1;
  store.set(params.key, existing);
  return {
    ok: true,
    remaining: Math.max(0, params.limit - existing.count),
    resetAtMs: existing.resetAtMs,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.ok ? String(result.remaining + 1) : "0");
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAtMs / 1000)));
  return headers;
}

