import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { executePurgeForTenant } from "@/modules/retention";

/**
 * Nightly retention purge entrypoint.
 *
 * Invoke via scheduler/cron (example):
 * - `npm run purge:nightly`
 *
 * This job is intentionally:
 * - tenant-scoped
 * - IDs-only in logs (no PII, no filenames, no storage keys)
 * - explicit about partial failures
 */
async function main(): Promise<void> {
  const startedAt = new Date();
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  logger.info("Retention purge job started", {
    tenantCount: tenants.length,
    startedAt: startedAt.toISOString(),
  });

  let totalDeleted = 0;
  let totalFailed = 0;
  let totalBlocked = 0;

  for (const t of tenants) {
    const res = await executePurgeForTenant({ tenantId: t.id });
    totalDeleted += res.deleted;
    totalFailed += res.failed;
    totalBlocked += res.blocked;

    logger.info("Retention purge job tenant summary", {
      tenantId: t.id,
      attempted: res.attempted,
      deleted: res.deleted,
      blocked: res.blocked,
      failed: res.failed,
    });
  }

  const finishedAt = new Date();
  logger.info("Retention purge job finished", {
    finishedAt: finishedAt.toISOString(),
    elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    totalDeleted,
    totalBlocked,
    totalFailed,
  });

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  logger.error("Retention purge job crashed", { err });
  process.exitCode = 1;
});

