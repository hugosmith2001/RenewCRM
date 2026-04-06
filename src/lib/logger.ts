type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /passcode/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /authorization/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /session/i,
  /email/i,
  /phone/i,
  /mobile/i,
  /ssn/i,
  /notes?/i,
  /description/i,
  /message/i, // often free-text
  /body/i, // request body
  /subject/i,
  /title/i,
  /name/i,
];

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

function redactValue(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  return REDACTED;
}

function redactDeep(input: unknown, seen = new WeakSet<object>()): unknown {
  if (input == null) return input;
  if (typeof input !== "object") return input;

  if (input instanceof Date) return input.toISOString();
  if (input instanceof Error) return redactValue(input);

  if (seen.has(input as object)) return "[Circular]";
  seen.add(input as object);

  if (Array.isArray(input)) return input.map((v) => redactDeep(v, seen));

  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = shouldRedactKey(k) ? redactValue(v) : redactDeep(v, seen);
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const base = {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "unknown",
  };

  const payload = context ? { ...base, context: redactDeep(context) } : base;

  // Keep it local/simple: emit JSON to stdout/stderr.
  const line = JSON.stringify(payload);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.info(line);
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    emit("error", message, context);
  },
};

