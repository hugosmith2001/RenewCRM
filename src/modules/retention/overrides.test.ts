import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRetentionPolicyForTenant, setRetentionOverrideForTenant } from "@/modules/retention/overrides";
import { SYSTEM_DEFAULT_RETENTION_DAYS } from "@/modules/retention/defaults";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    retentionPolicyOverride: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRetentionPolicyForTenant", () => {
  it("returns system default when no override exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const tenantId = "t1";
    const res = await getRetentionPolicyForTenant(tenantId, "AUDIT_EVENT");
    expect(res.source).toBe("system_default");
    expect(res.retentionDays).toBe(SYSTEM_DEFAULT_RETENTION_DAYS.AUDIT_EVENT);
  });

  it("returns tenant override when present (clamped within bounds)", async () => {
    mockFindUnique.mockResolvedValue({ retentionDays: 1 });
    const tenantId = "t1";
    const res = await getRetentionPolicyForTenant(tenantId, "AUDIT_EVENT");
    expect(res.source).toBe("tenant_override");
    // AUDIT_EVENT minDays is 30 (see defaults.ts)
    expect(res.retentionDays).toBeGreaterThanOrEqual(30);
  });
});

describe("setRetentionOverrideForTenant", () => {
  it("rejects out-of-bounds overrides", async () => {
    const res = await setRetentionOverrideForTenant({
      tenantId: "t1",
      category: "AUDIT_EVENT",
      retentionDays: 999999,
    });
    expect(res.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("upserts a valid override", async () => {
    mockUpsert.mockResolvedValue({ id: "r1" });
    const res = await setRetentionOverrideForTenant({
      tenantId: "t1",
      category: "AUDIT_EVENT",
      retentionDays: 90,
    });
    expect(res.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ tenantId: "t1", category: "AUDIT_EVENT", retentionDays: 90 }),
        update: { retentionDays: 90 },
      })
    );
  });
});

