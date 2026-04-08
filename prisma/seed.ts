import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { logger } from "../src/lib/logger";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-brokerage" },
    update: {},
    create: {
      name: "Demo Brokerage",
      slug: "demo-brokerage",
    },
  });

  const passwordHash = await hash("demo-password", 10);
  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@demo.safekeep.local",
      },
    },
    update: {
      passwordHash,
      sessionVersion: 0,
      isActive: true,
      name: "Demo Admin",
    },
    create: {
      tenantId: tenant.id,
      email: "admin@demo.safekeep.local",
      passwordHash,
      sessionVersion: 0,
      name: "Demo Admin",
    },
  });

  logger.info("Seed complete.");
}

main()
  .catch((e) => {
    logger.error("Seed failed", { err: e });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
