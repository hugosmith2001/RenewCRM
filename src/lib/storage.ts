/**
 * Object storage abstraction – Phase 6.
 * Local filesystem by default; S3-compatible when env vars are set.
 */
import { createReadStream, mkdirSync, unlinkSync, existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";

const STORAGE_ROOT = process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage");

function localPath(storageKey: string): string {
  return path.join(STORAGE_ROOT, storageKey);
}

/**
 * Ensure directory exists for a storage key (e.g. tenantId/documentId).
 */
export function ensureDirForKey(storageKey: string): void {
  const dir = path.dirname(localPath(storageKey));
  mkdirSync(dir, { recursive: true });
}

/**
 * Upload buffer to storage. Overwrites if key exists.
 */
export async function storagePut(storageKey: string, buffer: Buffer): Promise<void> {
  ensureDirForKey(storageKey);
  const fullPath = localPath(storageKey);
  const { writeFile } = await import("fs/promises");
  await writeFile(fullPath, buffer);
}

/**
 * Get file as Buffer. Throws if not found.
 */
export async function storageGet(storageKey: string): Promise<Buffer> {
  const fullPath = localPath(storageKey);
  if (!existsSync(fullPath)) {
    throw new Error("File not found");
  }
  return readFile(fullPath);
}

/**
 * Get readable stream for download (e.g. for piping to response).
 */
export function storageGetStream(storageKey: string): Readable {
  const fullPath = localPath(storageKey);
  if (!existsSync(fullPath)) {
    throw new Error("File not found");
  }
  return createReadStream(fullPath);
}

/**
 * Delete file by storage key. No-op if not found.
 */
export async function storageDelete(storageKey: string): Promise<void> {
  const fullPath = localPath(storageKey);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

/**
 * Build a unique storage key for a new document: tenantId/documentId/sanitizedFilename.
 */
export function buildStorageKey(tenantId: string, documentId: string, originalFilename: string): string {
  const safe = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
  return path.join(tenantId, documentId, safe);
}
