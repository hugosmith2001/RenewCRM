import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getDocumentById, getDocumentStream } from "@/modules/documents";
import { handleApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import path from "path";

type Params = { params: Promise<{ id: string; documentId: string }> };

export const runtime = "nodejs";
export const preferredRegion = "arn1";

function buildDownloadFilename(displayName: string, storageKey: string): string {
  const name = (displayName || "").trim() || "document";
  const storageBase = path.posix.basename(storageKey || "");
  const ext = path.posix.extname(storageBase);
  if (!ext) return name;
  const lower = name.toLowerCase();
  const lowerExt = ext.toLowerCase();
  if (lower.endsWith(lowerExt)) return name;
  return `${name}${ext}`;
}

function contentDispositionAttachment(filename: string): string {
  // RFC 6266 + RFC 5987: provide both filename and filename* for UTF-8.
  // Keep filename ASCII-ish for broad compatibility.
  const fallback = filename
    .replaceAll(/[\r\n"]/g, "")
    .replaceAll(/[^\x20-\x7E]/g, "_")
    .slice(0, 180) || "download";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const { id: customerId, documentId } = await params;
    const doc = await getDocumentById(user.tenantId, documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    if (doc.customerId !== customerId) {
      return NextResponse.json(
        { error: "Document does not belong to this customer" },
        { status: 400 }
      );
    }
    assertTenantAccess(user, doc.tenantId);

    const nodeStream = await getDocumentStream(doc.storageKey);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const headers = new Headers();
    const downloadName = buildDownloadFilename(doc.name, doc.storageKey);
    const disposition = contentDispositionAttachment(downloadName);
    headers.set("Content-Type", doc.mimeType || "application/octet-stream");
    headers.set("Content-Disposition", disposition);
    if (doc.sizeBytes != null) {
      headers.set("Content-Length", String(doc.sizeBytes));
    }

    logger.info("Document download served", {
      tenantId: user.tenantId,
      userId: user.id,
      customerId,
      documentId: doc.id,
      ok: true,
    });

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "File not found") {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    logger.warn("Document download failed", { err });
    return handleApiError(err);
  }
}
