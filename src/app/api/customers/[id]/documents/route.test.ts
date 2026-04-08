import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/customers/[id]/documents/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
  assertTenantAccess: vi.fn(),
}));

vi.mock("@/modules/customers", () => ({
  getCustomerById: vi.fn(),
}));

vi.mock("@/modules/documents", () => ({
  listDocumentsByCustomerId: vi.fn(),
  createDocument: vi.fn(),
}));

const { requireAuth, assertTenantAccess } = await import("@/modules/auth");
const { getCustomerById } = await import("@/modules/customers");
const {
  listDocumentsByCustomerId,
  createDocument,
} = await import("@/modules/documents");

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetCustomerById = vi.mocked(getCustomerById);
const mockAssertTenantAccess = vi.mocked(assertTenantAccess);
const mockListDocumentsByCustomerId = vi.mocked(listDocumentsByCustomerId);
const mockCreateDocument = vi.mocked(createDocument);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
};

const customerId = "cust-1";
const customer = {
  id: customerId,
  tenantId: "tenant-1",
  name: "Acme",
  type: "PRIVATE" as const,
  email: "acme@example.com",
  phone: null as string | null,
  address: null as string | null,
  ownerBrokerId: null as string | null,
  status: "ACTIVE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  owner: null,
};

function params(id: string) {
  return Promise.resolve({ id });
}

function formRequestWithFile(overrides: {
  name?: string;
  documentType?: string;
  policyId?: string;
  fileSize?: number;
  mimeType?: string;
} = {}) {
  const size = overrides.fileSize ?? 100;
  const form = new FormData();
  form.append(
    "file",
    new File([new Uint8Array(size)], "test.pdf", {
      type: overrides.mimeType ?? "application/pdf",
    })
  );
  form.append("name", overrides.name ?? "Test Document");
  form.append("documentType", overrides.documentType ?? "OTHER");
  if (overrides.policyId !== undefined) {
    form.append("policyId", overrides.policyId);
  }
  return new NextRequest("http://localhost", {
    method: "POST",
    body: form,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 6: GET/POST /api/customers/[id]/documents.
 * Covers: 401/403, 404 when customer not found, 200 list, 201 upload (mocked),
 * 400 no file, 400 file too large, 400 disallowed type, 400 validation, 400 createDocument null.
 * Does not cover: real storage, real DB, or FormData with very large file in Node.
 */
describe("GET /api/customers/[id]/documents", () => {
  it("returns 401 when requireRole throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(401);
    expect(mockListDocumentsByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params("bad-id"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
    expect(mockListDocumentsByCustomerId).not.toHaveBeenCalled();
  });

  it("returns 200 and documents array when customer exists", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const docs = [
      {
        id: "doc-1",
        name: "Policy PDF",
        documentType: "POLICY_DOCUMENT",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        createdAt: new Date(),
        policyId: null,
        policy: null,
      },
    ];
    mockListDocumentsByCustomerId.mockResolvedValue(docs);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Policy PDF");
    expect(mockListDocumentsByCustomerId).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId
    );
  });

  it("returns empty array when customer has no documents", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockListDocumentsByCustomerId.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost"), {
      params: params(customerId),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/customers/[id]/documents", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(formRequestWithFile(), {
      params: params(customerId),
    });

    expect(res.status).toBe(401);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("returns 404 when customer not found", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(null);

    const res = await POST(formRequestWithFile(), {
      params: params("bad-id"),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Customer not found");
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when no file in form", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const form = new FormData();
    form.append("name", "No file");
    form.append("documentType", "OTHER");
    const res = await POST(
      new NextRequest("http://localhost", { method: "POST", body: form }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("A file is required");
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when file is too large (over 20 MB)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      formRequestWithFile({
        fileSize: 21 * 1024 * 1024,
      }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too large|20 MB/i);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when file type is not allowed", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const res = await POST(
      formRequestWithFile({ mimeType: "application/octet-stream" }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type not allowed|Allowed/i);
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when metadata validation fails (invalid documentType)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});

    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array(10)], "test.pdf", {
        type: "application/pdf",
      })
    );
    form.append("name", "Doc");
    form.append("documentType", "INVALID_TYPE");
    const res = await POST(
      new NextRequest("http://localhost", { method: "POST", body: form }),
      { params: params(customerId) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it("returns 400 when createDocument returns null", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    mockCreateDocument.mockResolvedValue(null);

    const res = await POST(formRequestWithFile(), {
      params: params(customerId),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid customer or policy/i);
  });

  it("returns 201 and document when upload succeeds", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    mockGetCustomerById.mockResolvedValue(customer);
    mockAssertTenantAccess.mockImplementation(() => {});
    const created = {
      id: "doc-new",
      tenantId: "tenant-1",
      customerId,
      policyId: null,
      name: "Test Document",
      documentType: "OTHER",
      storageKey: "tenant-1/doc-new/test.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      createdAt: new Date(),
    };
    mockCreateDocument.mockResolvedValue(created);

    const res = await POST(formRequestWithFile(), {
      params: params(customerId),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("doc-new");
    expect(body.name).toBe("Test Document");
    expect(mockCreateDocument).toHaveBeenCalledWith(
      authUser.tenantId,
      customerId,
      expect.objectContaining({
        name: "Test Document",
        documentType: "OTHER",
      }),
      expect.objectContaining({
        mimeType: "application/pdf",
        originalFilename: "test.pdf",
      })
    );
  });
});
