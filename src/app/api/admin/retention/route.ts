import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/modules/auth";
import { RETENTION_OVERRIDE_BOUNDS_DAYS, SYSTEM_DEFAULT_RETENTION_DAYS } from "@/modules/retention";
import { getRetentionPolicyForTenant, setRetentionOverrideForTenant } from "@/modules/retention/overrides";
import { setRetentionOverrideSchema } from "@/lib/validations/retention";
import { handleApiError } from "@/lib/api-error";
import { Role } from "@prisma/client";

/**
 * Admin retention overrides (Phase 4).
 *
 * GET  /api/admin/retention  - list effective policies and bounds
 * POST /api/admin/retention  - set/update a tenant override (bounded)
 */

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN]);

    const categories = Object.keys(SYSTEM_DEFAULT_RETENTION_DAYS) as Array<keyof typeof SYSTEM_DEFAULT_RETENTION_DAYS>;
    const effective = await Promise.all(
      categories.map(async (category) => {
        const policy = await getRetentionPolicyForTenant(user.tenantId, category);
        return {
          category,
          retentionDays: policy.retentionDays,
          source: policy.source,
          systemDefaultDays: SYSTEM_DEFAULT_RETENTION_DAYS[category],
          bounds: RETENTION_OVERRIDE_BOUNDS_DAYS[category],
        };
      })
    );

    return NextResponse.json({ policies: effective });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([Role.ADMIN]);
    const body = await request.json();
    const parsed = setRetentionOverrideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const res = await setRetentionOverrideForTenant({
      tenantId: user.tenantId,
      category: parsed.data.category,
      retentionDays: parsed.data.retentionDays,
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Retention override out of bounds" }, { status: 400 });
    }

    const effective = await getRetentionPolicyForTenant(user.tenantId, parsed.data.category);
    return NextResponse.json({ policy: effective }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

