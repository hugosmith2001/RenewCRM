import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/insurers/route";
import { NextRequest } from "next/server";

vi.mock("@/modules/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/modules/policies", () => ({
  listInsurers: vi.fn(),
  createInsurer: vi.fn(),
}));

const { requireAuth } = await import("@/modules/auth");
const { listInsurers, createInsurer } = await import("@/modules/policies");

const mockRequireAuth = vi.mocked(requireAuth);
const mockListInsurers = vi.mocked(listInsurers);
const mockCreateInsurer = vi.mocked(createInsurer);

const authUser = {
  id: "user-1",
  email: "broker@tenant.local",
  name: "Broker",
  tenantId: "tenant-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Phase 5: GET/POST /api/insurers.
 * Covers: 401/403, 200 list, 201 create, 400 validation (POST).
 * Does not cover: real DB or session.
 */
describe("GET /api/insurers", () => {
  it("returns 401 when requireAuth throws Unauthorized", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("http://localhost/api/insurers"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockListInsurers).not.toHaveBeenCalled();
  });

  it("returns 200 and insurers array when authenticated", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    const insurers = [
      {
        id: "ins-1",
        tenantId: "tenant-1",
        name: "If",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockListInsurers.mockResolvedValue(insurers);

    const res = await GET(new NextRequest("http://localhost/api/insurers"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("ins-1");
    expect(body[0].name).toBe("If");
    expect(mockListInsurers).toHaveBeenCalledWith("tenant-1");
  });
});

describe("POST /api/insurers", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(
      new NextRequest("http://localhost/api/insurers", {
        method: "POST",
        body: JSON.stringify({ name: "New Insurer" }),
      })
    );

    expect(res.status).toBe(401);
    expect(mockCreateInsurer).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (missing name)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);

    const res = await POST(
      new NextRequest("http://localhost/api/insurers", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(mockCreateInsurer).not.toHaveBeenCalled();
  });

  it("returns 400 when body validation fails (empty name)", async () => {
    mockRequireAuth.mockResolvedValue(authUser);

    const res = await POST(
      new NextRequest("http://localhost/api/insurers", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      })
    );

    expect(res.status).toBe(400);
    expect(mockCreateInsurer).not.toHaveBeenCalled();
  });

  it("returns 201 and created insurer when valid", async () => {
    mockRequireAuth.mockResolvedValue(authUser);
    const created = {
      id: "ins-new",
      tenantId: "tenant-1",
      name: "New Insurer",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateInsurer.mockResolvedValue(created);

    const res = await POST(
      new NextRequest("http://localhost/api/insurers", {
        method: "POST",
        body: JSON.stringify({ name: "New Insurer" }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("ins-new");
    expect(body.name).toBe("New Insurer");
    expect(mockCreateInsurer).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ name: "New Insurer" })
    );
  });
});
