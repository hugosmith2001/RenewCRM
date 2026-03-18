import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

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
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.safekeep.local",
      passwordHash,
      name: "Demo Admin",
      role: "ADMIN",
    },
  });

  console.log("Seed complete. Login with admin@demo.safekeep.local / demo-password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
