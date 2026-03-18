import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/customers/[id]/documents/[documentId]/download/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { Readable } from "stream";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/documents", () => ({
  getDocumentById: vi.fn(),
  getDocumentStream: vi.fn(),
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const { getDocumentById, getDocumentStream } = await import("@/modules/documents");

const mockRequireRole = vi.mocked(requireRole);
const mockGetDocumentById = vi.mocked(getDocumentById);
const mockGetDocumentStream = vi.mocked(getDocumentStream);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
  role: Role.BROKER,
};

const customerId = "cust-1";
const documentId = "doc-1";
const document = {
  id: documentId,
  tenantId: "tenant-1",
  customerId,
  policyId: null,
  name: "Policy PDF",
  documentType: "POLICY_DOCUMENT",
  storageKey: "tenant-1/doc-1/file.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  createdAt: new Date(),
  policy: null,
};

function params(custId: string, docId: string) {
  return Promise.resolve({ id: custId, documentId: docId });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 6: GET /api/customers/[id]/documents/[documentId]/download.
 * Covers: 401/403, 404 when document not found, 400 when doc belongs to other
 * customer, 200 with stream and headers, 404 when storage throws File not found.
 * Does not cover: real file stream or storage.
 */
describe("GET /api/customers/[id]/documents/[documentId]/download", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(401);
    expect(mockGetDocumentStream).not.toHaveBeenCalled();
  });

  it("returns 404 when document not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-doc"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Document not found");
    expect(mockGetDocumentStream).not.toHaveBeenCalled();
  });

  it("returns 400 when document belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue({
      ...document,
      customerId: "other-customer",
    });

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Document does not belong to this customer");
    expect(mockGetDocumentStream).not.toHaveBeenCalled();
  });

  it("returns 200 with stream and correct headers when document exists", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue(document);
    mockAssertTenantAccess.mockImplementation(() => {});
    const nodeStream = Readable.from(Buffer.from("pdf content"));
    mockGetDocumentStream.mockReturnValue(nodeStream);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain(
      encodeURIComponent("Policy PDF")
    );
    expect(res.headers.get("Content-Length")).toBe("1024");
    expect(res.body).toBeDefined();
    expect(mockGetDocumentStream).toHaveBeenCalledWith(document.storageKey);
  });

  it("returns 404 when storage throws File not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue(document);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockGetDocumentStream.mockImplementation(() => {
      throw new Error("File not found");
    });

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("File not found");
  });
});
