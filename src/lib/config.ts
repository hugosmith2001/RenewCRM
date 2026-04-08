import { z } from "zod";

type NodeEnv = "development" | "test" | "production";

function loadEnvFilesIfNeeded(): void {
  // Next.js normally loads .env files, but in some runtimes (Turbopack/module
  // eval order) our config can be evaluated before that happens.
  if (process.env.DATABASE_URL && process.env.AUTH_SECRET) return;
  if (process.env.NEXT_RUNTIME === "edge") return;

  // Avoid importing third-party dotenv in server bundles; Turbopack can trip over
  // it during HMR. We only need a minimal parser for local development.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");

    const candidates = [".env.local", ".env"];
    for (const filename of candidates) {
      const fullPath = path.join(process.cwd(), filename);
      if (!fs.existsSync(fullPath)) continue;
      const raw = fs.readFileSync(fullPath, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // If reading fails, we'll fail with a clear validation error below.
  }
}

function nodeEnv(): NodeEnv {
  const env = process.env.NODE_ENV;
  if (env === "production" || env === "test" || env === "development") return env;
  return "development";
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isNextBuild(): boolean {
  // Next.js sets NEXT_PHASE during builds; avoid throwing at build-time when runtime env differs.
  return process.env.NEXT_PHASE === "phase-production-build";
}

const storageDriverSchema = z.enum(["local", "s3"]).default("local");

export type StorageDriver = z.infer<typeof storageDriverSchema>;

export type StorageConfig =
  | {
    driver: "local";
    rootPath: string;
    allowInProduction: boolean;
    localEncryption: {
      enabled: boolean;
      key?: string;
      allowUnencryptedInProduction: boolean;
    };
  }
  | {
    driver: "s3";
    // Reserved for future S3-compatible implementation.
    bucket: string;
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    prefix?: string;
    sse?: "AES256" | "aws:kms";
    kmsKeyId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

export type RuntimeConfig = {
  env: NodeEnv;
  databaseUrl: string;
  authSecret: string;
  storage: StorageConfig;
};

const baseSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  STORAGE_DRIVER: z.string().optional(),
  STORAGE_PATH: z.string().optional(),
  STORAGE_ALLOW_LOCAL_IN_PROD: z.string().optional(),
  STORAGE_LOCAL_ENCRYPTION_KEY: z.string().optional(),
  STORAGE_LOCAL_ENCRYPTION_ENABLED: z.string().optional(),
  STORAGE_LOCAL_UNENCRYPTED_OK_IN_PROD: z.string().optional(),
  // S3-compatible reserved fields (for validation/documentation only for now).
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_FORCE_PATH_STYLE: z.string().optional(),
  STORAGE_S3_PREFIX: z.string().optional(),
  STORAGE_S3_SSE: z.string().optional(),
  STORAGE_S3_KMS_KEY_ID: z.string().optional(),
  STORAGE_S3_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().optional(),
});

let cachedConfig: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  loadEnvFilesIfNeeded();

  const parsed = baseSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => {
        const key = e.path?.length ? String(e.path.join(".")) : "(root)";
        return `${key}: ${e.message}`;
      })
      .join("; ");
    throw new Error(
      `Invalid environment configuration: ${message}. Check your .env (or deployment env vars).`
    );
  }

  const env = nodeEnv();
  const driver = storageDriverSchema.parse(parsed.data.STORAGE_DRIVER);

  const rootPath =
    parsed.data.STORAGE_PATH?.trim() || `${process.cwd()}/storage`;

  if (driver === "local") {
    const allowInProduction = isTruthy(parsed.data.STORAGE_ALLOW_LOCAL_IN_PROD);
    const localEncryptionEnabled = isTruthy(
      parsed.data.STORAGE_LOCAL_ENCRYPTION_ENABLED
    );
    const allowUnencryptedInProduction = isTruthy(
      parsed.data.STORAGE_LOCAL_UNENCRYPTED_OK_IN_PROD
    );

    if (env === "production" && !isNextBuild() && !allowInProduction) {
      throw new Error(
        "Refusing to start with local filesystem document storage in production. Set STORAGE_ALLOW_LOCAL_IN_PROD=true only if you accept the risk."
      );
    }

    if (env === "production" && !isNextBuild() && allowInProduction && !localEncryptionEnabled && !allowUnencryptedInProduction) {
      throw new Error(
        "Local filesystem storage in production must be encrypted or explicitly acknowledged. Set STORAGE_LOCAL_ENCRYPTION_ENABLED=true with STORAGE_LOCAL_ENCRYPTION_KEY, or set STORAGE_LOCAL_UNENCRYPTED_OK_IN_PROD=true."
      );
    }

    if (localEncryptionEnabled) {
      const key = parsed.data.STORAGE_LOCAL_ENCRYPTION_KEY?.trim();
      if (!key || key.length < 32) {
        throw new Error(
          "STORAGE_LOCAL_ENCRYPTION_KEY is required and must be at least 32 chars when STORAGE_LOCAL_ENCRYPTION_ENABLED=true."
        );
      }
    }

    cachedConfig = {
      env,
      databaseUrl: parsed.data.DATABASE_URL,
      authSecret: parsed.data.AUTH_SECRET,
      storage: {
        driver: "local",
        rootPath,
        allowInProduction,
        localEncryption: {
          enabled: localEncryptionEnabled,
          key: parsed.data.STORAGE_LOCAL_ENCRYPTION_KEY?.trim(),
          allowUnencryptedInProduction,
        },
      },
    };
    return cachedConfig;
  }

  // "s3" reserved validation: fail fast until implementation lands.
  const bucket = parsed.data.STORAGE_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error("STORAGE_S3_BUCKET is required when STORAGE_DRIVER=s3.");
  }
  throw new Error(
    "STORAGE_DRIVER=s3 is configured but S3-compatible storage is not implemented in this codebase yet."
  );
}

export function assertRuntimeConfig(): void {
  // Intentionally just forces validation and throws on error.
  void getRuntimeConfig();
}

