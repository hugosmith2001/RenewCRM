/**
 * Object storage abstraction – Phase 6.
 * Local filesystem for development; Amazon S3 in production when configured.
 */
import { createReadStream, mkdirSync, unlinkSync, existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import crypto from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import type { StorageConfig } from "@/lib/config";
import { getRuntimeConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

function getStorageConfig(): StorageConfig {
  return getRuntimeConfig().storage;
}

function isLocalStorage(cfg: StorageConfig): cfg is Extract<StorageConfig, { driver: "local" }> {
  return cfg.driver === "local";
}

function isS3Storage(cfg: StorageConfig): cfg is Extract<StorageConfig, { driver: "s3" }> {
  return cfg.driver === "s3";
}

/** Validates storageKey for both local paths and S3 object keys (relative, no traversal). */
function validateRelativeStorageKey(storageKey: string): void {
  if (!storageKey || storageKey.length > 1024) {
    throw new Error("Invalid storage key");
  }
  if (path.isAbsolute(storageKey)) {
    throw new Error("Invalid storage key");
  }
  const normalized = storageKey.replaceAll("\\", "/");
  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../")
  ) {
    throw new Error("Invalid storage key");
  }
}

function localFullPath(storageKey: string, rootPath: string): string {
  validateRelativeStorageKey(storageKey);
  const fullPath = path.join(rootPath, storageKey);
  const resolvedRoot = path.resolve(rootPath);
  const resolvedFull = path.resolve(fullPath);
  if (!resolvedFull.startsWith(resolvedRoot + path.sep) && resolvedFull !== resolvedRoot) {
    throw new Error("Invalid storage key");
  }
  return fullPath;
}

let s3Client: S3Client | null = null;
let s3ClientSignature: string | null = null;

function getS3Client(): S3Client {
  const cfg = getStorageConfig();
  if (!isS3Storage(cfg)) {
    throw new Error("S3 client requested but STORAGE_DRIVER is not s3");
  }
  const sig = [
    cfg.region,
    cfg.bucket,
    cfg.endpoint ?? "",
    String(cfg.forcePathStyle),
    cfg.accessKeyId ?? "",
  ].join("|");
  if (s3Client && s3ClientSignature === sig) {
    return s3Client;
  }
  s3Client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials:
      cfg.accessKeyId && cfg.secretAccessKey
        ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey }
        : undefined,
  });
  s3ClientSignature = sig;
  return s3Client;
}

function s3ObjectKey(storageKey: string, cfg: Extract<StorageConfig, { driver: "s3" }>): string {
  validateRelativeStorageKey(storageKey);
  return cfg.keyPrefix ? `${cfg.keyPrefix}/${storageKey}` : storageKey;
}

function mapS3Failure(err: unknown, storageKey: string, op: string): never {
  if (err instanceof S3ServiceException) {
    const code = err.name;
    const status = err.$metadata?.httpStatusCode;
    if (code === "NoSuchKey" || code === "NotFound" || status === 404) {
      throw new Error("File not found");
    }
  }
  logger.error(`S3 ${op} failed`, {
    storageKeyHash: hashKey(storageKey),
    code: err instanceof S3ServiceException ? err.name : undefined,
    message: err instanceof Error ? err.message : "unknown",
  });
  throw new Error("Storage operation failed");
}

type EncryptedBlob = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

const ENCRYPTION_PREFIX = "SKENC1:";

function getEncryptionKey(localCfg: Extract<StorageConfig, { driver: "local" }>): Buffer | null {
  const raw = localCfg.localEncryption.key;
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

function encryptIfEnabled(plain: Buffer, localCfg: Extract<StorageConfig, { driver: "local" }>): Buffer {
  if (!localCfg.localEncryption.enabled) return plain;
  const key = getEncryptionKey(localCfg);
  if (!key) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  const blob: EncryptedBlob = {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64"),
  };

  return Buffer.from(ENCRYPTION_PREFIX + JSON.stringify(blob), "utf8");
}

function decryptIfEnabled(raw: Buffer, localCfg: Extract<StorageConfig, { driver: "local" }>): Buffer {
  const key = getEncryptionKey(localCfg);
  const text = raw.toString("utf8");
  if (!text.startsWith(ENCRYPTION_PREFIX)) {
    return raw;
  }
  if (!key) {
    throw new Error("Encrypted file cannot be decrypted (missing key)");
  }

  const json = text.slice(ENCRYPTION_PREFIX.length);
  const parsed = JSON.parse(json) as EncryptedBlob;
  if (parsed?.v !== 1 || parsed.alg !== "aes-256-gcm") {
    throw new Error("Unsupported encrypted blob format");
  }

  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const data = Buffer.from(parsed.data, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Ensure directory exists for a storage key (local driver only; no-op for S3).
 */
export function ensureDirForKey(storageKey: string): void {
  const cfg = getStorageConfig();
  if (!isLocalStorage(cfg)) return;
  const dir = path.dirname(localFullPath(storageKey, cfg.rootPath));
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

/**
 * Upload buffer to storage. Overwrites if key exists.
 */
export async function storagePut(storageKey: string, buffer: Buffer): Promise<void> {
  const cfg = getStorageConfig();
  if (isLocalStorage(cfg)) {
    ensureDirForKey(storageKey);
    const fullPath = localFullPath(storageKey, cfg.rootPath);
    const { writeFile } = await import("fs/promises");
    const payload = encryptIfEnabled(buffer, cfg);
    await writeFile(fullPath, payload, { mode: 0o600 });
    return;
  }

  const client = getS3Client();
  const key = s3ObjectKey(storageKey, cfg);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: buffer,
        ServerSideEncryption: "AES256",
      })
    );
  } catch (err) {
    mapS3Failure(err, storageKey, "put");
  }
}

/**
 * Get file as Buffer. Throws if not found.
 */
export async function storageGet(storageKey: string): Promise<Buffer> {
  const cfg = getStorageConfig();
  if (isLocalStorage(cfg)) {
    const fullPath = localFullPath(storageKey, cfg.rootPath);
    if (!existsSync(fullPath)) {
      throw new Error("File not found");
    }
    const raw = await readFile(fullPath);
    return decryptIfEnabled(raw, cfg);
  }

  const client = getS3Client();
  const key = s3ObjectKey(storageKey, cfg);
  try {
    const out = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    );
    if (!out.Body) {
      throw new Error("File not found");
    }
    return Buffer.from(await out.Body.transformToByteArray());
  } catch (err) {
    if (err instanceof Error && err.message === "File not found") {
      throw err;
    }
    mapS3Failure(err, storageKey, "get");
  }
}

/**
 * Get readable stream for download (e.g. for piping to response).
 */
export async function storageGetStream(storageKey: string): Promise<Readable> {
  const cfg = getStorageConfig();
  if (isLocalStorage(cfg)) {
    const fullPath = localFullPath(storageKey, cfg.rootPath);
    if (!existsSync(fullPath)) {
      throw new Error("File not found");
    }
    if (cfg.localEncryption.key) {
      return Readable.from(
        (async function* () {
          const raw = await readFile(fullPath);
          const plain = decryptIfEnabled(raw, cfg);
          yield plain;
        })()
      );
    }
    return createReadStream(fullPath);
  }

  const client = getS3Client();
  const key = s3ObjectKey(storageKey, cfg);
  try {
    const out = await client.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    );
    if (!out.Body) {
      throw new Error("File not found");
    }
    // In Node.js, S3 GetObject `Body` is typically a Node Readable stream.
    // Prefer streaming to avoid buffering large files in memory (which can cause 500/timeouts).
    const bodyAny = out.Body as unknown as {
      transformToByteArray?: () => Promise<Uint8Array>;
      on?: (...args: any[]) => any;
      pipe?: (...args: any[]) => any;
    };
    if (typeof bodyAny.pipe === "function" || typeof bodyAny.on === "function") {
      return out.Body as unknown as Readable;
    }

    if (typeof bodyAny.transformToByteArray === "function") {
      const bytes = await bodyAny.transformToByteArray();
      return Readable.from([Buffer.from(bytes)]);
    }

    throw new Error("Storage operation failed");
  } catch (err) {
    if (err instanceof Error && err.message === "File not found") {
      throw err;
    }
    mapS3Failure(err, storageKey, "getStream");
  }
}

/**
 * Delete file by storage key. No-op if not found (local); S3 delete is idempotent.
 */
export async function storageDelete(storageKey: string): Promise<void> {
  const cfg = getStorageConfig();
  if (isLocalStorage(cfg)) {
    const fullPath = localFullPath(storageKey, cfg.rootPath);
    if (existsSync(fullPath)) {
      try {
        unlinkSync(fullPath);
      } catch (err) {
        logger.error("Storage delete failed", { err, storageKeyHash: hashKey(storageKey) });
        throw new Error("Storage delete failed");
      }
    }
    return;
  }

  const client = getS3Client();
  const key = s3ObjectKey(storageKey, cfg);
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      })
    );
  } catch (err) {
    mapS3Failure(err, storageKey, "delete");
  }
}

function hashKey(storageKey: string): string {
  return crypto.createHash("sha256").update(storageKey, "utf8").digest("hex").slice(0, 16);
}

/**
 * Build a unique storage key for a new document: tenantId/documentId/sanitizedFilename.
 */
export function buildStorageKey(tenantId: string, documentId: string, originalFilename: string): string {
  const safe = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
  return [tenantId, documentId, safe].join("/");
}
