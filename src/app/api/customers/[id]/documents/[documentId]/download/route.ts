import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertTenantAccess } from "@/modules/auth";
import { getDocumentById, getDocumentStream } from "@/modules/documents";
import { handleApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; documentId: string }> };

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

    const nodeStream = getDocumentStream(doc.storageKey);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const headers = new Headers();
    const disposition = `attachment; filename="${encodeURIComponent(doc.name)}"`;
    headers.set("Content-Type", doc.mimeType);
    headers.set("Content-Disposition", disposition);
    headers.set("Content-Length", String(doc.sizeBytes));

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
