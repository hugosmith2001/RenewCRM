import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET,
  DELETE,
} from "@/app/api/customers/[id]/documents/[documentId]/route";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";

vi.mock("@/modules/auth", () => ({
  requireRole: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/documents", () => ({
  getDocumentById: vi.fn(),
  deleteDocument: vi.fn(),
}));

const { requireRole, assertTenantAccess } = await import("@/modules/auth");
const { getDocumentById, deleteDocument } = await import("@/modules/documents");

const mockRequireRole = vi.mocked(requireRole);
const mockGetDocumentById = vi.mocked(getDocumentById);
const mockDeleteDocument = vi.mocked(deleteDocument);
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
 * Phase 6: GET/DELETE /api/customers/[id]/documents/[documentId].
 * Covers: 401/403, 404 when document not found, 400 when doc belongs to other
 * customer, 200 GET, 204 DELETE. Does not cover: real DB or storage.
 */
describe("GET /api/customers/[id]/documents/[documentId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(401);
    expect(mockGetDocumentById).not.toHaveBeenCalled();
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
  });

  it("returns 200 and document when found and customer matches", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue(document);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(documentId);
    expect(body.name).toBe("Policy PDF");
    expect(mockGetDocumentById).toHaveBeenCalledWith(
      authUser.tenantId,
      documentId
    );
  });
});

describe("DELETE /api/customers/[id]/documents/[documentId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireRole.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(401);
    expect(mockDeleteDocument).not.toHaveBeenCalled();
  });

  it("returns 403 when STAFF (delete requires ADMIN or BROKER)", async () => {
    mockRequireRole.mockRejectedValue(new Error("Forbidden"));

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(403);
    expect(mockDeleteDocument).not.toHaveBeenCalled();
  });

  it("returns 404 when document not found", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, "bad-doc"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Document not found");
    expect(mockDeleteDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when document belongs to different customer", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue({
      ...document,
      customerId: "other-customer",
    });

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Document does not belong to this customer");
    expect(mockDeleteDocument).not.toHaveBeenCalled();
  });

  it("returns 204 and calls deleteDocument when authorized", async () => {
    mockRequireRole.mockResolvedValue(authUser);
    mockGetDocumentById.mockResolvedValue(document);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockDeleteDocument.mockResolvedValue(true);

    const res = await DELETE(new NextRequest("http://localhost"), {
      params: params(customerId, documentId),
    });

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(mockDeleteDocument).toHaveBeenCalledWith(
      authUser.tenantId,
      documentId
    );
  });
});
