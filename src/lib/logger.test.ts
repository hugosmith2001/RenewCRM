import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

function lastJson(spy: ReturnType<typeof vi.spyOn>) {
  const call = spy.mock.calls.at(-1);
  if (!call || typeof call[0] !== "string") throw new Error("Expected logger to write JSON string");
  return JSON.parse(call[0]);
}

describe("logger (PII-safe redaction)", () => {
  const originalEnv = process.env.NODE_ENV;

  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("redacts sensitive keys deeply (password/token/email/name/free-text-ish keys)", () => {
    process.env.NODE_ENV = "test";

    logger.info("hello", {
      ok: true,
      password: "supersecret",
      token: "tkn",
      email: "user@example.com",
      name: "User Name",
      nested: {
        authorization: "Bearer abc",
        profile: { phone: "+1-555-0100" },
        safe: { tenantId: "t1", count: 1 },
      },
      arr: [{ message: "free text" }, { x: 1 }],
    });

    const payload = lastJson(infoSpy);
    expect(payload.level).toBe("info");
    expect(payload.message).toBe("hello");
    expect(payload.context.ok).toBe(true);

    expect(payload.context.password).toBe("[REDACTED]");
    expect(payload.context.token).toBe("[REDACTED]");
    expect(payload.context.email).toBe("[REDACTED]");
    expect(payload.context.name).toBe("[REDACTED]");

    expect(payload.context.nested.authorization).toBe("[REDACTED]");
    expect(payload.context.nested.profile.phone).toBe("[REDACTED]");
    expect(payload.context.nested.safe).toEqual({ tenantId: "t1", count: 1 });

    expect(payload.context.arr[0].message).toBe("[REDACTED]");
    expect(payload.context.arr[1]).toEqual({ x: 1 });
  });

  it("redacts Error details and omits stack in production", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("DB exploded");

    logger.error("boom", { err, password: "p" });

    const payload = lastJson(errorSpy);
    expect(payload.level).toBe("error");
    expect(payload.context.password).toBe("[REDACTED]");
    expect(payload.context.err).toEqual({
      name: "Error",
      message: "DB exploded",
      stack: undefined,
    });
  });

  it("handles circular objects without throwing", () => {
    process.env.NODE_ENV = "test";
    const a: any = { ok: true };
    a.self = a;
    logger.warn("circular", { a });
    const payload = lastJson(warnSpy);
    expect(payload.context.a.self).toBe("[Circular]");
  });
});

