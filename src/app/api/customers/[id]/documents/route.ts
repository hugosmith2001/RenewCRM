import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertTenantAccess } from "@/modules/auth";
import { getCustomerById } from "@/modules/customers";
import {
  listDocumentsByCustomerId,
  createDocument,
} from "@/modules/documents";
import { logAuditEvent } from "@/modules/audit";
import { createDocumentMetadataSchema } from "@/lib/validations/documents";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

function serializeDocument(doc: { [k: string]: unknown }) {
  return doc;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER, Role.STAFF]);
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    assertTenantAccess(user, customer.tenantId);
    const documents = await listDocumentsByCustomerId(user.tenantId, customerId);
    return NextResponse.json(documents.map((d) => serializeDocument(d)));
  } catch (err) {
    return handleApiError(err);
  }
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole([Role.ADMIN, Role.BROKER]);
    const { id: customerId } = await params;
    const customer = await getCustomerById(user.tenantId, customerId);
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    assertTenantAccess(user, customer.tenantId);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "A file is required" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 20 MB)" },
        { status: 400 }
      );
    }
    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: PDF, images, Word, text, CSV." },
        { status: 400 }
      );
    }

    const name = (formData.get("name") as string)?.trim() || file.name;
    const documentType = (formData.get("documentType") as string) || "OTHER";
    const policyId = (formData.get("policyId") as string)?.trim() || undefined;

    const parsed = createDocumentMetadataSchema.safeParse({
      name,
      documentType,
      policyId: policyId || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await createDocument(
      user.tenantId,
      customerId,
      parsed.data,
      {
        buffer,
        originalFilename: file.name,
        mimeType,
      }
    );

    if (!doc) {
      return NextResponse.json(
        { error: "Failed to create document (invalid customer or policy)" },
        { status: 400 }
      );
    }

    await logAuditEvent({
      tenantId: user.tenantId,
      userId: user.id,
      action: "UPLOAD",
      entityType: "Document",
      entityId: doc.id,
      metadata: { name: doc.name, documentType: doc.documentType, customerId },
    });

    return NextResponse.json(serializeDocument(doc), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
