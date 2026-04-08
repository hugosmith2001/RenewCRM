/**
 * Object storage abstraction – Phase 6.
 * Local filesystem by default; S3-compatible when env vars are set.
 */
import { createReadStream, mkdirSync, unlinkSync, existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import crypto from "crypto";
import { getRuntimeConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

const cfg = getRuntimeConfig();
const localStorage = (() => {
  if (cfg.storage.driver !== "local") {
    // Until S3 support is implemented, config validation will throw before this module is used.
    throw new Error("Unsupported storage driver");
  }
  return cfg.storage;
})();

const STORAGE_ROOT = localStorage.rootPath;

function localPath(storageKey: string): string {
  if (!storageKey || storageKey.length > 1024) {
    throw new Error("Invalid storage key");
  }
  if (path.isAbsolute(storageKey)) {
    throw new Error("Invalid storage key");
  }
  // Prevent traversal and surprising separators.
  const normalized = storageKey.replaceAll("\\", "/");
  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../")
  ) {
    throw new Error("Invalid storage key");
  }

  const fullPath = path.join(STORAGE_ROOT, storageKey);
  const resolvedRoot = path.resolve(STORAGE_ROOT);
  const resolvedFull = path.resolve(fullPath);
  if (!resolvedFull.startsWith(resolvedRoot + path.sep) && resolvedFull !== resolvedRoot) {
    throw new Error("Invalid storage key");
  }
  return fullPath;
}

/**
 * Ensure directory exists for a storage key (e.g. tenantId/documentId).
 */
export function ensureDirForKey(storageKey: string): void {
  const dir = path.dirname(localPath(storageKey));
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

type EncryptedBlob = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
};

const ENCRYPTION_PREFIX = "SKENC1:";

function getEncryptionKey(): Buffer | null {
  const raw = localStorage.localEncryption.key;
  if (!raw) return null;
  // Derive a stable 32-byte key from the provided secret material.
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

function encryptIfEnabled(plain: Buffer): Buffer {
  if (!localStorage.localEncryption.enabled) return plain;
  const key = getEncryptionKey();
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

function decryptIfEnabled(raw: Buffer): Buffer {
  const key = getEncryptionKey();
  const text = raw.toString("utf8");
  if (!text.startsWith(ENCRYPTION_PREFIX)) {
    return raw;
  }
  if (!key) {
    // Encrypted blob present but we can't decrypt (missing key).
    // Failing loudly avoids "random text file" downloads of ciphertext/metadata.
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
 * Upload buffer to storage. Overwrites if key exists.
 */
export async function storagePut(storageKey: string, buffer: Buffer): Promise<void> {
  ensureDirForKey(storageKey);
  const fullPath = localPath(storageKey);
  const { writeFile } = await import("fs/promises");
  const payload = encryptIfEnabled(buffer);
  await writeFile(fullPath, payload, { mode: 0o600 });
}

/**
 * Get file as Buffer. Throws if not found.
 */
export async function storageGet(storageKey: string): Promise<Buffer> {
  const fullPath = localPath(storageKey);
  if (!existsSync(fullPath)) {
    throw new Error("File not found");
  }
  const raw = await readFile(fullPath);
  return decryptIfEnabled(raw);
}

/**
 * Get readable stream for download (e.g. for piping to response).
 */
export function storageGetStream(storageKey: string): Readable {
  const fullPath = localPath(storageKey);
  if (!existsSync(fullPath)) {
    throw new Error("File not found");
  }
  // If we have a key configured, we can transparently decrypt encrypted blobs.
  // Files are limited to 20MB by API constraints, so buffering is acceptable.
  if (localStorage.localEncryption.key) {
    return Readable.from(
      (async function* () {
        const raw = await readFile(fullPath);
        const plain = decryptIfEnabled(raw);
        yield plain;
      })()
    );
  }
  return createReadStream(fullPath);
}

/**
 * Delete file by storage key. No-op if not found.
 */
export async function storageDelete(storageKey: string): Promise<void> {
  const fullPath = localPath(storageKey);
  if (existsSync(fullPath)) {
    try {
      unlinkSync(fullPath);
    } catch (err) {
      logger.error("Storage delete failed", { err, storageKeyHash: hashKey(storageKey) });
      throw new Error("Storage delete failed");
    }
  }
}

function hashKey(storageKey: string): string {
  // Avoid logging the actual path/key.
  return crypto.createHash("sha256").update(storageKey, "utf8").digest("hex").slice(0, 16);
}

/**
 * Build a unique storage key for a new document: tenantId/documentId/sanitizedFilename.
 */
export function buildStorageKey(tenantId: string, documentId: string, originalFilename: string): string {
  const safe = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
  // Use POSIX-style keys regardless of OS to keep storageKey stable.
  return [tenantId, documentId, safe].join("/");
}
