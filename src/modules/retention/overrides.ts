import { prisma } from "@/lib/db";
import { RETENTION_OVERRIDE_BOUNDS_DAYS, SYSTEM_DEFAULT_RETENTION_DAYS } from "@/modules/retention/defaults";
import type { RetentionCategory } from "@prisma/client";

export type RetentionPolicy = {
  category: RetentionCategory;
  retentionDays: number;
  source: "system_default" | "tenant_override";
};

export async function getRetentionPolicyForTenant(
  tenantId: string,
  category: RetentionCategory
): Promise<RetentionPolicy> {
  const override = await prisma.retentionPolicyOverride.findUnique({
    where: { tenantId_category: { tenantId, category } },
    select: { retentionDays: true },
  });

  const fallbackDays = SYSTEM_DEFAULT_RETENTION_DAYS[category];
  if (!override) {
    return { category, retentionDays: fallbackDays, source: "system_default" };
  }

  const bounds = RETENTION_OVERRIDE_BOUNDS_DAYS[category];
  const clamped = Math.max(bounds.minDays, Math.min(bounds.maxDays, override.retentionDays));
  return { category, retentionDays: clamped, source: "tenant_override" };
}

export async function setRetentionOverrideForTenant(input: {
  tenantId: string;
  category: RetentionCategory;
  retentionDays: number;
}): Promise<{ ok: true; retentionDays: number } | { ok: false; reason: "out_of_bounds" }> {
  const bounds = RETENTION_OVERRIDE_BOUNDS_DAYS[input.category];
  if (input.retentionDays < bounds.minDays || input.retentionDays > bounds.maxDays) {
    return { ok: false, reason: "out_of_bounds" };
  }

  await prisma.retentionPolicyOverride.upsert({
    where: { tenantId_category: { tenantId: input.tenantId, category: input.category } },
    create: {
      tenantId: input.tenantId,
      category: input.category,
      retentionDays: input.retentionDays,
    },
    update: { retentionDays: input.retentionDays },
  });

  return { ok: true, retentionDays: input.retentionDays };
}

